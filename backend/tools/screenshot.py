from langchain.tools import tool
import os
import mss
import mss.tools

# Dynamically create a screenshots folder in your project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOT_DIR = os.path.join(BASE_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)
IMAGE_PATH = os.path.join(SCREENSHOT_DIR, "latest.png")

@tool("capture_screenshot", return_direct=True)
def take_screenshot() -> str:
    """
    Captures the current screen and saves it to the local screenshots folder.
    Use this tool when the user says: "Take a screenshot", "Capture the screen"
    """
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # Main monitor
            screenshot = sct.grab(monitor)
            mss.tools.to_png(screenshot.rgb, screenshot.size, output=IMAGE_PATH)

        return f"Screenshot captured and saved sir."
    except Exception as e:
        return f"Failed to capture screenshot: {str(e)}"