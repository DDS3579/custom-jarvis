# main.py
import os
import logging
import time
import queue
import threading
import win32com.client
import pythoncom
from dotenv import load_dotenv
import speech_recognition as sr
from langchain_ollama import ChatOllama
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

from tools.time import get_time
from tools.OCR import read_text_from_latest_image
from tools.arp_scan import arp_scan_terminal
from tools.duckduckgo import duckduckgo_search_tool
from tools.matrix import matrix_mode
from tools.screenshot import take_screenshot
from tools.todo import add_todo, remove_todo, complete_todo, list_todos

from bridge import post

load_dotenv()

MIC_INDEX = None
TRIGGER_WORD = "jarvis"
CONVERSATION_TIMEOUT = 30

logging.basicConfig(level=logging.INFO)

tools_list = [
    get_time, arp_scan_terminal, read_text_from_latest_image,
    duckduckgo_search_tool, matrix_mode, take_screenshot,
    add_todo, remove_todo, complete_todo, list_todos
]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Jarvis, an intelligent, conversational AI assistant. Your goal is to be helpful, friendly, and informative. You can respond in natural, human-like language and use tools when needed to answer questions more accurately. Always explain your reasoning simply when appropriate, and keep your responses conversational and concise."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# ── TTS QUEUE ──────────────────────────────────────────────────────────────
tts_queue: queue.Queue = queue.Queue()


def tts_worker():
    """
    Direct SAPI5 via win32com — synchronous Speak() blocks until audio
    finishes, so no event sinks, no message pumping, no silent skips.
    pyttsx3's runAndWait() silently bails when NumberOfActiveItems == 0,
    which happens on every call after the first.
    """
    pythoncom.CoInitialize()
    logging.info("🔊 TTS worker ready.")

    def _make_speaker():
        spk = win32com.client.Dispatch("SAPI.SpVoice")
        voices = spk.GetVoices()
        for i in range(voices.Count):
            v = voices.Item(i)
            if "jamie" in v.GetDescription().lower():
                spk.Voice = v
                break
        spk.Rate = 2      # SAPI scale: -10 (slowest) → 10 (fastest); 0 = default ~150 wpm
        spk.Volume = 100
        return spk

    speaker = _make_speaker()

    while True:
        text = tts_queue.get()
        if text is None:          # shutdown signal
            break
        try:
            speaker.Speak(text, 0)    # 0 = SVSFDefault → synchronous, blocks until done
        except Exception as e:
            logging.error(f"❌ TTS error: {e}")
            try:
                speaker = _make_speaker()
                speaker.Speak(text, 0)
            except Exception as retry_err:
                logging.error(f"❌ TTS reinit failed: {retry_err}")
        finally:
            tts_queue.task_done()

    pythoncom.CoUninitialize()


def speak_text(text: str):
    post("status", "speaking")
    post("log", ("jarvis", text))
    logging.info(f"🤖 Jarvis: {text}")
    tts_queue.put(text)
    tts_queue.join()              # wait for audio to finish
    post("status", "idle")


def extract_output(response: dict) -> str:
    output = response.get("output", "")
    if isinstance(output, str):
        return output.strip()
    if isinstance(output, list):
        parts = []
        for item in output:
            if isinstance(item, dict):
                parts.append(item.get("text", str(item)))
            else:
                parts.append(str(item))
        return " ".join(parts).strip()
    if isinstance(output, dict):
        return output.get("text", str(output)).strip()
    return str(output).strip()


# ── MAIN VOICE LOOP ────────────────────────────────────────────────────────
def write():
    # Start TTS worker thread
    tts_thread = threading.Thread(target=tts_worker, daemon=True)
    tts_thread.start()

    print("🔥 JARVIS VOICE LOOP STARTED SUCCESSFULLY")
    post("status", "idle")

    try:
        recognizer = sr.Recognizer()
        mic = sr.Microphone(device_index=MIC_INDEX)
        llm = ChatOllama(model="qwen3:1.7b", reasoning=False)
        agent = create_tool_calling_agent(llm=llm, tools=tools_list, prompt=prompt)
        executor = AgentExecutor(agent=agent, tools=tools_list, verbose=True)
    except Exception as e:
        logging.critical(f"❌ Failed to initialize: {e}")
        post("status", "error")
        tts_queue.put(None)
        return

    conversation_mode = False
    last_interaction_time = None

    try:
        with mic as source:
            recognizer.adjust_for_ambient_noise(source)

            while True:
                try:
                    if not conversation_mode:
                        post("status", "idle")
                        logging.info("🎤 Listening for wake word...")
                        audio = recognizer.listen(source, timeout=10)
                        transcript = recognizer.recognize_google(audio)  # type: ignore
                        logging.info(f"🗣 Heard: {transcript}")

                        if TRIGGER_WORD.lower() in transcript.lower():
                            post("log", ("user", transcript))
                            speak_text("Yes sir?")
                            conversation_mode = True
                            last_interaction_time = time.time()

                    else:
                        post("status", "listening")
                        logging.info("🎤 Listening for next command...")
                        audio = recognizer.listen(source, timeout=10)
                        command = recognizer.recognize_google(audio)  # type: ignore
                        logging.info(f"📥 Command: {command}")

                        post("log", ("user", command))
                        post("status", "thinking")

                        try:
                            response = executor.invoke({"input": command})
                            content = extract_output(response)
                        except Exception as agent_err:
                            logging.error(f"❌ Agent error: {agent_err}")
                            content = "I encountered an error processing that request, sir."

                        if not content:
                            content = "I'm not sure how to respond to that, sir."

                        speak_text(content)
                        last_interaction_time = time.time()

                except sr.WaitTimeoutError:
                    if (
                        conversation_mode
                        and last_interaction_time
                        and (time.time() - last_interaction_time > CONVERSATION_TIMEOUT)
                    ):
                        logging.info("⌛ Timeout: Returning to wake word mode.")
                        speak_text("Going on standby, sir.")
                        conversation_mode = False

                except sr.UnknownValueError:
                    pass

                except Exception as e:
                    logging.error(f"❌ Loop error: {e}")
                    time.sleep(1)

    except Exception as e:
        logging.critical(f"❌ Critical error in main loop: {e}")
    finally:
        tts_queue.put(None)


if __name__ == "__main__":
    write()