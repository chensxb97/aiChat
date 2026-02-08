import asyncio
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

# Initialize FastMCP in stateless mode
mcp = FastMCP("Calculator", stateless_http=True)

# Define the delay in seconds
DELAY_SECONDS = 2

@mcp.tool()
async def add(a: int, b: int) -> dict: # Change return type to dict
    """Adds two numbers with a deliberate delay."""
    await asyncio.sleep(DELAY_SECONDS)
    return {"result": a + b}

@mcp.tool()
async def subtract(a: int, b: int) -> dict:
    """Subtracts b from a with a deliberate delay."""
    await asyncio.sleep(DELAY_SECONDS)
    return {"result": a - b}

@mcp.tool()
async def multiply(a: int, b: int) -> dict:
    """Multiplies two numbers with a deliberate delay."""
    await asyncio.sleep(DELAY_SECONDS)
    return {"result": a * b}

@mcp.tool()
async def divide(a: int, b: int) -> dict:
    """Divides a by b with a deliberate delay."""
    if b == 0:
        raise ToolError("Cannot divide by zero. Please provide a non-zero divisor.")
    await asyncio.sleep(DELAY_SECONDS)
    return {"result": a / b}

if __name__ == "__main__":
    # Runs on http://localhost:5000/mcp
    mcp.run(transport="http", port=5000)