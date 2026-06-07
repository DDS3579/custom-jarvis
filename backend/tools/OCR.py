from langchain.tools import tool
from PIL import Image
import pytesseract
import os

# Point to the exact same dynamic path as the screenshot tool
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE_PATH = os.path.join(BASE_DIR, "screenshots", "latest.png")

@tool("read_latest_screenshot", return_direct=True)
def read_text_from_latest_image() -> str:
    """
    Reads and extracts text from the most recent screenshot.
    Use this tool when the user says: "Read the screen", "What does the screenshot say?"
    """
    if not os.path.exists(IMAGE_PATH):
        return "I haven't taken a screenshot yet, sir. Please ask me to capture the screen first."

    try:
        img = Image.open(IMAGE_PATH)
        text = pytesseract.image_to_string(img)
        return text.strip() if text else "No readable text found in the screenshot."
    except Exception as e:
        return f"Failed to extract text: {str(e)}"