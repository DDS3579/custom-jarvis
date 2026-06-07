from langchain.tools import tool
import subprocess
import platform

@tool("arp_scan_terminal", return_direct=True)
def arp_scan_terminal() -> str:
    """
    Scans the local network and returns the list of connected devices.
    Use this when the user asks to see connected devices, run an arp scan, or find devices on the network.
    """
    system = platform.system()
    try:
        # Run arp -a silently and capture the output
        if system == "Windows":
            result = subprocess.run(["arp", "-a"], capture_output=True, text=True, shell=True)
        else: # macOS and Linux
            result = subprocess.run(["arp", "-a"], capture_output=True, text=True)
            
        if result.returncode == 0:
            # Return the raw text so the LLM can summarize it for the user
            return f"Here is the raw ARP data. Please summarize the connected devices for the user:\n{result.stdout}"
        else:
            return f"Failed to run arp scan. Error: {result.stderr}"
    except Exception as e:
        return f"An error occurred while scanning the network: {str(e)}"