import os
import logging
import time
import pyttsx3
import pythoncom
from dotenv import load_dotenv
import speech_recognition as sr
from langchain_ollama import ChatOllama
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

# Import tools
from tools.time import get_time
from tools.OCR import read_text_from_latest_image
from tools.arp_scan import arp_scan_terminal
from tools.duckduckgo import duckduckgo_search_tool
from tools.matrix import matrix_mode
from tools.screenshot import take_screenshot
from tools.todo import add_todo, remove_todo, complete_todo, list_todos

# 🔥 CRITICAL: Import post from the bridge, NOT the old GUI
try:
    from bridge import post
except ImportError:
    def post(event, data=None): 
        print(f"[FALLBACK POST] {event}: {data}")

load_dotenv()

MIC_INDEX = None
TRIGGER_WORD = "jarvis"
CONVERSATION_TIMEOUT = 30

# Keep logging clean so we can see server errors
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

def speak_text(text: str, engine):
    post("status", "speaking")
    post("log", ("jarvis", text))
    try:
        engine.say(text)
        engine.runAndWait()
        time.sleep(0.3)
    except Exception as e:
        logging.error(f"❌ TTS failed: {e}")
    finally:
        post("status", "idle")

def write():
    pythoncom.CoInitialize()
    print("🔥 JARVIS VOICE LOOP STARTED SUCCESSFULLY")
    post("status", "idle")
    
    try:
        recognizer = sr.Recognizer()
        mic = sr.Microphone(device_index=MIC_INDEX)
        
        llm = ChatOllama(model="qwen3:1.7b", reasoning=False)
        agent = create_tool_calling_agent(llm=llm, tools=tools_list, prompt=prompt)
        executor = AgentExecutor(agent=agent, tools=tools_list, verbose=True)
        
        engine = pyttsx3.init()
        # ✅ Fixed: check for list/tuple before iterating
        voices = engine.getProperty("voices")
        if isinstance(voices, (list, tuple)):
            for voice in voices:
                if "jamie" in voice.name.lower():
                    engine.setProperty("voice", voice.id)
                    break
        else:
            logging.warning("⚠️ No voices list returned, using default voice.")
        
        engine.setProperty("rate", 180)
        engine.setProperty("volume", 1.0)
        
    except Exception as e:
        logging.critical(f"❌ Failed to initialize hardware/LLM: {e}")
        post("status", "error")
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
                            speak_text("Yes sir?", engine)
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

                        response = executor.invoke({"input": command})
                        content = response["output"]
                        
                        speak_text(content, engine)
                        last_interaction_time = time.time()

                except sr.WaitTimeoutError:
                    if conversation_mode and last_interaction_time and (time.time() - last_interaction_time > CONVERSATION_TIMEOUT):
                        logging.info("⌛ Timeout: Returning to wake word mode.")
                        conversation_mode = False
                except sr.UnknownValueError:
                    pass
                except Exception as e:
                    logging.error(f"❌ Loop error: {e}")
                    time.sleep(1)

    except Exception as e:
        logging.critical(f"❌ Critical error in main loop: {e}")

if __name__ == "__main__":
    write()