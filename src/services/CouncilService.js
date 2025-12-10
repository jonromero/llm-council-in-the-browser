
/**
 * Service for Council Orchestration Logic.
 * Ports backend/council.py and backend/openrouter.py to client-side JS.
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class CouncilService {
    constructor(apiKey, councilModels, chairmanModel) {
        this.apiKey = apiKey;
        this.councilModels = councilModels;
        this.chairmanModel = chairmanModel;
    }

    /**
     * Helper to query OpenRouter API with retry logic
     */
    async queryModel(model, messages, onEvent, timeout = 60000, retries = 3) {
        let lastError;

        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'LLM Council Client',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(id);

                if (response.status === 429) {
                    const msg = `Rate limit hit for ${model}, retrying in ${Math.pow(2, i + 1)}s...`;
                    console.warn(msg);
                    if (onEvent) onEvent('warning', { message: msg });

                    // Exponential backoff: 2s, 4s, 8s
                    const backoff = Math.pow(2, i + 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    continue;
                }

                if (!response.ok) {
                    const errorMsg = `Error querying ${model}: ${response.statusText}`;
                    console.error(errorMsg);
                    if (onEvent) onEvent('warning', { message: errorMsg });
                    return null; // Don't retry other errors for now
                }

                const data = await response.json();
                if (data.error) {
                    const errorMsg = `API Error for ${model}: ${data.error.message || JSON.stringify(data.error)}`;
                    console.error(errorMsg);
                    if (onEvent) onEvent('warning', { message: errorMsg });
                    return null;
                }

                return data.choices[0].message;

            } catch (error) {
                console.error(`Exception querying ${model}:`, error);
                lastError = error;
                if (onEvent) onEvent('warning', { message: `Connection error for ${model}, retrying...` });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const finalMsg = `Failed to query ${model} after ${retries} retries.`;
        console.error(finalMsg);
        if (onEvent) onEvent('error', { message: finalMsg });
        return null;
    }

    /**
     * Helper to query multiple models in parallel
     */
    async queryModelsParallel(models, messages, onEvent) {
        const promises = models.map(async (model) => {
            const response = await this.queryModel(model, messages, onEvent);
            return { model, response };
        });

        const results = await Promise.all(promises);
        const resultMap = {};
        results.forEach(({ model, response }) => {
            resultMap[model] = response;
        });
        return resultMap;
    }

    /**
     * Stage 1: Collect individual responses from all council models.
     */
    /**
     * Stage 1: Collect individual responses from all council models.
     */
    async stage1_collect_responses(userQuery, onEvent) {
        const messages = [{ role: 'user', content: userQuery }];
        const responses = await this.queryModelsParallel(this.councilModels, messages, onEvent);

        const results = [];
        for (const [model, response] of Object.entries(responses)) {
            if (response) {
                results.push({
                    model: model,
                    response: response.content,
                });
            }
        }
        return results;
    }

    /**
     * Stage 2: Each model ranks the anonymized responses.
     */
    /**
     * Stage 2: Each model ranks the anonymized responses.
     */
    async stage2_collect_rankings(userQuery, stage1Results, onEvent) {
        const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i)); // A, B, C...

        const labelToModel = {};
        stage1Results.forEach((result, i) => {
            labelToModel[`Response ${labels[i]}`] = result.model;
        });

        const responsesText = stage1Results.map((result, i) =>
            `Response ${labels[i]}:\n${result.response}`
        ).join('\n\n');

        const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

        const messages = [{ role: 'user', content: rankingPrompt }];
        const responses = await this.queryModelsParallel(this.councilModels, messages, onEvent);

        const stage2Results = [];
        for (const [model, response] of Object.entries(responses)) {
            if (response) {
                const fullText = response.content;
                stage2Results.push({
                    model: model,
                    ranking: fullText,
                    parsed_ranking: this.parseRankingFromText(fullText),
                });
            }
        }

        return { stage2Results, labelToModel };
    }

    parseRankingFromText(text) {
        // Look for FINAL RANKING section
        let rankingSection = text;
        if (text.includes("FINAL RANKING:")) {
            rankingSection = text.split("FINAL RANKING:")[1];
        }

        // Look for "Response X"
        const matches = rankingSection.match(/Response [A-Z]/g);
        return matches || [];
    }

    calculateAggregateRankings(stage2Results, labelToModel) {
        const modelPositions = {}; // { modelName: [rank1, rank2...] }

        stage2Results.forEach(result => {
            const parsed = result.parsed_ranking;
            parsed.forEach((label, index) => {
                const modelName = labelToModel[label];
                if (modelName) {
                    if (!modelPositions[modelName]) modelPositions[modelName] = [];
                    modelPositions[modelName].push(index + 1); // 1-based rank
                }
            });
        });

        const aggregate = [];
        for (const [model, positions] of Object.entries(modelPositions)) {
            const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
            aggregate.push({
                model: model,
                average_rank: parseFloat(avg.toFixed(2)),
                rankings_count: positions.length
            });
        }

        aggregate.sort((a, b) => a.average_rank - b.average_rank);
        return aggregate;
    }

    /**
     * Stage 3: Chairman synthesizes final response.
     */
    async stage3_synthesize_final(userQuery, stage1Results, stage2Results, onEvent) {
        const stage1Text = stage1Results.map(r =>
            `Model: ${r.model}\nResponse: ${r.response}`
        ).join('\n\n');

        const stage2Text = stage2Results.map(r =>
            `Model: ${r.model}\nRanking: ${r.ranking}`
        ).join('\n\n');

        const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

        const messages = [{ role: 'user', content: chairmanPrompt }];
        const response = await this.queryModel(this.chairmanModel, messages, onEvent);

        if (!response) {
            return {
                model: this.chairmanModel,
                response: "Error: Unable to generate final synthesis."
            };
        }

        return {
            model: this.chairmanModel,
            response: response.content
        };
    }

    async generateConversationTitle(userQuery) {
        const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

        const messages = [{ role: 'user', content: titlePrompt }];
        // Use a cheap model for titles
        const response = await this.queryModel("z-ai/glm-4.5-air:free", messages, 30000);

        if (!response) return "New Conversation";

        let title = response.content.trim();
        title = title.replace(/['"]/g, '');
        if (title.length > 50) title = title.substring(0, 47) + "...";

        return title;
    }

    /**
     * Runs the full process and calls onEvent for updates
     */
    async runFullCouncil(userQuery, onEvent) {
        // Stage 1
        onEvent('stage1_start');
        const stage1Results = await this.stage1_collect_responses(userQuery, onEvent);
        if (stage1Results.length === 0) {
            onEvent('error', { message: 'All models failed to respond' });
            return;
        }
        onEvent('stage1_complete', stage1Results);

        // Stage 2
        onEvent('stage2_start');
        const { stage2Results, labelToModel } = await this.stage2_collect_rankings(userQuery, stage1Results, onEvent);
        const aggregateRankings = this.calculateAggregateRankings(stage2Results, labelToModel);

        onEvent('stage2_complete', {
            data: stage2Results,
            metadata: { label_to_model: labelToModel, aggregate_rankings: aggregateRankings }
        });

        // Stage 3
        onEvent('stage3_start');
        const stage3Result = await this.stage3_synthesize_final(userQuery, stage1Results, stage2Results, onEvent);
        onEvent('stage3_complete', stage3Result);

        // Title Generation (Parallel-ish)
        this.generateConversationTitle(userQuery).then(title => {
            onEvent('title_complete', title);
        });

        onEvent('complete');
    }
}
