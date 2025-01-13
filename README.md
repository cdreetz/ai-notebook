# AI Notebook

AI Notebook is an interactive web-based notebook application that combines the power of AI assistance with Python code execution capabilities. Built with Next.js and featuring a modern, responsive interface, it allows users to write, execute, and document code while getting AI-powered help along the way.

## Features

- **Interactive Code Cells**: Write and execute Python code directly in your browser
- **AI Assistant**: Built-in AI chat interface to help with coding questions
- **Python Libraries**: Pre-loaded with essential scientific computing libraries:
  - Matplotlib for data visualization
  - NumPy for numerical computing
  - NetworkX for graph computations
- **Markdown Support**: Create rich documentation with markdown cells
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing
- **Notebook Management**: Save and load notebooks to preserve your work
- **Real-time Code Execution**: Run Python code in real-time using Pyodide
- **Context-Aware AI**: Share code and outputs directly with the AI assistant for targeted help

## Usage

### Code Cells
- Click "+ Code" to add a new Python code cell
- Write Python code in the cell
- Click "Run" to execute the code
- View outputs, including matplotlib visualizations, directly below the cell

### Markdown Cells
- Click "+ Markdown" to add a new markdown cell
- Write formatted text using markdown syntax
- The cell will render the markdown in real-time

### AI Assistant
- Use the chat interface on the right to get help
- Click the arrow button next to any code cell or output to share it with the AI
- Ask questions about your code or get suggestions for improvements

### Notebook Management
- Click "Save Notebook" to save your current work
- Use the dropdown menu to load previously saved notebooks

## Development

The project uses the following key technologies:
- Next.js 14 for the framework
- Tailwind CSS for styling
- Pyodide for in-browser Python execution
- OpenAI's GPT-4 for AI assistance
- CodeMirror for the code editor
- React Markdown for markdown rendering

## Getting Started Locally

1. Clone the repository:

```bash
git clone https://github.com/cdreetz/ai-notebook
cd ai-notebook
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev-all
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to start using AI Notebook.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)



## TODO

- [] highlight + cmd k
- [] notebook method context object, as we define new methods, add them to context in a way they can be reused by the AI
- [] refer to what lou said, click cell to view docs view. maybe use that as the context ?
- [] more keybinds, new cell, run cell, etc
- [] new cell should place cursor in the new cell