from websocket import create_connection
import json

# Get your token from login
TOKEN = "your-jwt-token-here"

# Connect to WebSocket
ws = create_connection(f"ws://localhost:5000/monitoring?token={TOKEN}")
print("✅ Connected to WebSocket")

# Listen for messages
while True:
    try:
        result = ws.recv()
        data = json.loads(result)
        print(f"📡 Received: {data}")
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"Error: {e}")

ws.close()