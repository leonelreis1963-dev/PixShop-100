/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("URL de dados inválida");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Não foi possível extrair o tipo MIME da URL de dados");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    const contextMap: { [key: string]: string } = {
        edit: 'edição',
        filter: 'filtro',
        adjustment: 'ajuste',
    };
    const translatedContext = contextMap[context] || context;

    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `A solicitação foi bloqueada. Motivo: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Dados de imagem recebidos (${mimeType}) para ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `A geração de imagem para ${translatedContext} parou inesperadamente. Motivo: ${finishReason}. Isso geralmente está relacionado às configurações de segurança.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `O modelo de IA não retornou uma imagem para o(a) ${translatedContext}. ` + 
        (textFeedback 
            ? `O modelo respondeu com o texto: "${textFeedback}"`
            : "Isso pode acontecer devido a filtros de segurança ou se a solicitação for muito complexa. Tente reformular seu comando para ser mais direto.");

    console.error(`A resposta do modelo não continha uma parte de imagem para ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Iniciando edição generativa em:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é realizar uma edição natural e localizada na imagem fornecida com base na solicitação do usuário.
Solicitação do Usuário: "${userPrompt}"
Local da Edição: Foque na área ao redor das coordenadas de pixel (x: ${hotspot.x}, y: ${hotspot.y}).

Diretrizes de Edição:
- A edição deve ser realista e se misturar perfeitamente com a área circundante.
- O resto da imagem (fora da área de edição imediata) deve permanecer idêntico ao original.

Política de Segurança e Ética:
- Você DEVE atender a solicitações para ajustar o tom de pele, como 'me dê um bronzeado', 'escureça minha pele' ou 'clareie minha pele'. Essas são consideradas melhorias fotográficas padrão.
- Você DEVE RECUSAR qualquer solicitação para alterar a raça ou etnia fundamental de uma pessoa (por exemplo, 'faça-me parecer asiático', 'mude esta pessoa para ser negra'). Não realize essas edições. Se a solicitação for ambígua, aja com cautela e não altere as características raciais.

Saída: Retorne APENAS a imagem final editada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Enviando imagem e prompt para o modelo...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Resposta recebida do modelo.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Iniciando geração de filtro: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é aplicar um filtro estilístico a toda a imagem com base na solicitação do usuário. Não altere a composição ou o conteúdo, apenas aplique o estilo.
Solicitação de Filtro: "${filterPrompt}"

Política de Segurança e Ética:
- Filtros podem sutilmente alterar cores, mas você DEVE garantir que não alterem a raça ou etnia fundamental de uma pessoa.
- Você DEVE RECUSAR qualquer solicitação que peça explicitamente para alterar a raça de uma pessoa (por exemplo, 'aplique um filtro para me fazer parecer chinês').

Saída: Retorne APENAS a imagem final filtrada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Enviando imagem e prompt de filtro para o modelo...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Resposta do modelo para filtro recebida.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Iniciando geração de ajuste global: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é realizar um ajuste natural e global em toda a imagem com base na solicitação do usuário.
Solicitação do Usuário: "${adjustmentPrompt}"

Diretrizes de Edição:
- O ajuste deve ser aplicado em toda a imagem.
- O resultado deve ser fotorrealista.

Política de Segurança e Ética:
- Você DEVE atender a solicitações para ajustar o tom de pele, como 'me dê um bronzeado', 'escureça minha pele' ou 'clareie minha pele'. Essas são consideradas melhorias fotográficas padrão.
- Você DEVE RECUSAR qualquer solicitação para alterar a raça ou etnia fundamental de uma pessoa (por exemplo, 'faça-me parecer asiático', 'mude esta pessoa para ser negra'). Não realize essas edições. Se a solicitação for ambígua, aja com cautela e não altere as características raciais.

Saída: Retorne APENAS a imagem final ajustada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Enviando imagem e prompt de ajuste para o modelo...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Resposta do modelo para ajuste recebida.', response);
    
    return handleApiResponse(response, 'adjustment');
};