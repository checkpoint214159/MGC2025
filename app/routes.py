from flask import Blueprint, render_template, request
from .services.process_input import process

bp = Blueprint("main", __name__)

@bp.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@bp.route("/process", methods=["POST"])
def process_input():
    user_input = request.form.get("user_input")
    result = process(user_input)
    return render_template("index.html", result=result)
