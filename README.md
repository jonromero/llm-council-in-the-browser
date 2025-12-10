# LLM Council (Client-Side Edition)

A backend-free, client-side only version of the [LLM Council](https://github.com/karpathy/llm-council).

**LLM Council** orchestrates a "council" of AI models to answer your questions. It queries multiple LLMs in parallel (Stage 1), asks them to peer-review and rank each other's responses (Stage 2), and then synthesizes a final, comprehensive answer using a Chairman model (Stage 3).

## Features

- **Local & Private**: Runs entirely in your browser. No backend server required.
- **Data Persistence**: Conversations and Settings are stored securely in your browser's `localStorage`.
- **Model Flexibility**: Configure any models available via [OpenRouter](https://openrouter.ai/).
- **Resilient**: Handles API rate limits automatically with smart retries.

## Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/llm-council-client.git
    cd llm-council-client
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application**:
    ```bash
    npm run dev
    ```

4.  **Open in Browser**:
    Navigate to `http://localhost:5173` (or the URL shown in your terminal).

## Configuration

1.  Click the **Settings** (gear icon) in the sidebar.
2.  Enter your **OpenRouter API Key**.
3.  Configure your **Council Models** (the models that generate initial responses and rank others).
4.  Select a **Chairman Model** (the model that synthesizes the final answer).

## Usage

1.  Start a **New Conversation**.
2.  Type your question and hit enter.
3.  Watch as the Council:
    - **Stage 1**: Collects responses from all Council Models.
    - **Stage 2**: Have models rank each other's answers.
    - **Stage 3**: Chairman provides the final synthesis.

## Credits

Based on the original [LLM Council](https://github.com/karpathy/llm-council) by [Andrej Karpathy](https://github.com/karpathy). This version was adapted to run as a standalone client-side application.
