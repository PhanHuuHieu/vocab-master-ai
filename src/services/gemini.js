const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export async function generateWithGemini(prompt) {
    if (!API_KEY) {
        throw new Error("Thiếu VITE_GEMINI_API_KEY trong file .env");
    }

    try {
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const apiMessage =
                data?.error?.message || `Gemini API lỗi: HTTP ${response.status}`;
            throw new Error(apiMessage);
        }

        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Không nhận được nội dung phản hồi từ Gemini.";

        return text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}