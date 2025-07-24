import { useEffect } from "react";

export default function useTTS(speakButtonRef, rulesContainerRef) {
    useEffect(() => {
        let currentSpeech = null;
        let isSpeaking = false;

        const speechSupported = "speechSynthesis" in window;

        const updateButton = () => {
            const btn = speakButtonRef.current;
            if (!btn) return;

            if (isSpeaking) {
                btn.classList.add("speaking");
                btn.innerHTML = '<span class="material-symbols-outlined">stop</span>';
                btn.title = "Stop reading";
            } else {
                btn.classList.remove("speaking");
                btn.innerHTML = '<span class="material-symbols-outlined">volume_up</span>';
                btn.title = "Read rules aloud";
            }
        };

        const stopSpeech = () => {
            if (window.speechSynthesis && isSpeaking) {
                window.speechSynthesis.cancel();
                isSpeaking = false;
                currentSpeech = null;
                updateButton();
                if (rulesContainerRef?.current) {
                    rulesContainerRef.current.classList.remove("rules-speaking");
                }
            }
        };

        const startSpeech = () => {
            stopSpeech();

            const textNodes = [
                document.getElementById("code_rule"),
                document.getElementById("email_rule"),
                document.getElementById("username_rule"),
                document.getElementById("pwd_rule"),
                document.getElementById("repeatpwd_rule"),
            ];

            let text = textNodes
                .filter(Boolean)
                .map((el) => el.textContent || el.innerText)
                .filter(Boolean)
                .join(". ");

            if (!text.trim()) {
                text = "No rules available to read.";
            }

            currentSpeech = new SpeechSynthesisUtterance(text);
            currentSpeech.rate = 0.9;
            currentSpeech.pitch = 1.0;
            currentSpeech.volume = 0.8;
            currentSpeech.lang = "en-US";

            currentSpeech.onstart = () => {
                isSpeaking = true;
                updateButton();
                rulesContainerRef?.current?.classList.add("rules-speaking");
            };

            currentSpeech.onend = () => {
                isSpeaking = false;
                currentSpeech = null;
                updateButton();
                rulesContainerRef?.current?.classList.remove("rules-speaking");
            };

            currentSpeech.onerror = (event) => {
                console.error("Speech error:", event.error);
                isSpeaking = false;
                currentSpeech = null;
                updateButton();
                rulesContainerRef?.current?.classList.remove("rules-speaking");
            };

            window.speechSynthesis.speak(currentSpeech);
        };

        const toggleSpeech = () => {
            try {
                if (isSpeaking) stopSpeech();
                else startSpeech();
            } catch (error) {
                console.error("TTS Error:", error);
            }
        };

        if (!speechSupported && speakButtonRef?.current) {
            speakButtonRef.current.style.display = "none";
            return;
        }

        const btn = speakButtonRef?.current;
        if (btn) {
            btn.addEventListener("click", toggleSpeech);
        }

        const handleVisibilityChange = () => {
            if (document.hidden && isSpeaking) stopSpeech();
        };

        const handleUnload = () => {
            if (isSpeaking) stopSpeech();
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && isSpeaking) stopSpeech();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleUnload);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            if (btn) btn.removeEventListener("click", toggleSpeech);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleUnload);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [speakButtonRef, rulesContainerRef]);
}
