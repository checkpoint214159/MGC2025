# app/main.py

from flask import Flask, render_template

# The Flask application object is now named 'app'
app = Flask(__name__)

# Flask looks for the 'templates' folder relative to THIS file's location,
# which is now inside the 'app' directory. This is why the template lookup works.

@app.route('/')
def home():
    return render_template('index.html') 

if __name__ == '__main__':
    # You would typically run the application using 'app'
    app.run()
