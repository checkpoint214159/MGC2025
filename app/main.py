# app/main.py (FASTAPI IMPLEMENTATION)

import os
from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates

# 1. Initialize the FastAPI application object
app = FastAPI()

# 2. Configure Jinja2 Templates
# FastAPI expects the template directory path to be relative 
# to the execution root, which is one level up from app/
# So, we point it to the 'templates' folder inside the 'app' directory.
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))


@app.get("/login")
async def login(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "result": None})

# POST Route: Process Form Submission
@app.post("/process")
async def process_form(request: Request, user_input: str = Form(...)):
    processed_result = f"You entered: '{user_input}'. Thanks for the data!"

    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "result": processed_result}
    )

# Note: The '__init__.py' file is still needed for module imports, 
# but the if __name__ == '__main__': block is no longer used, as Uvicorn 
# executes the application directly.