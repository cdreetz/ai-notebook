# AI Notebook

AI Notebook is an interactive web-based notebook application that combines the power of AI assistance with Python code execution capabilities.

## Key Features

- cmd+k, inline code generation, if you've used Cursor, you know cmd+k
- cmd+k+highlight, inline code editing, highlight some text and prompt it to be changed
- chat, native chat sidebar that you can easily pass in code context from your notebook
- environments, ai-notebook creates a local env and allows you to manage and install packages within the UI
- notebook context, an object that is created as you use the notebook, tracking the methods you have written and variables you have defined, for you to reference but is also used to make sure chat always knows what you have going on in your notebook
- saving, easily save and load notebooks within the UI, all saved to the same dir where your env/ is created
- visualization, it wouldnt be a notebook if it didnt allow for inline plotting, supports matplotlib and seaborn currently

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

## Usage

### Code Cells

- Use the cmd+shift+b shortcut to add a new code cell
- Write Python code in the cell
- Use cmd+enter to execute the code
- View outputs, including matplotlib visualizations, directly below the cell

### Markdown Cells

- Click "+ Markdown" to add a new markdown cell
- Write formatted text using markdown syntax
- The cell will render the markdown in real-time

### AI Assistant

- Use the chat interface on the right to get help
- Use cmd+k while in a cell to prompt for inline code generation
- Use cmd+k on highlighted to text to prompt for inline code editing

### Notebook Management

- Click "Save Notebook" to save your current work
- Load previously saved notebooks at any time

## Development

The project uses the following key technologies:

- Next.js 14 for the framework
- Tailwind CSS for styling
- Pyodide for in-browser Python execution
- OpenAI's GPT-4 for AI assistance
- CodeMirror for the code editor
- React Markdown for markdown rendering

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

