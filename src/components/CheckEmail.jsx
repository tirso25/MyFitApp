import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import CryptoJS from "crypto-js";
import confetti from "canvas-confetti";
import { Notyf } from "notyf";
import useTTS from "../hooks/useTTS.js";
import "notyf/notyf.min.css";
import 'animate.css';
import "../styles/general.css";
import "../styles/checkCode.css";

const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.es)$/;
const API_BASE_URL = 'https://myfitapp.onrender.com';

export default function CheckEmail() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const emailRef = useRef(null);
    const emailRuleRef = useRef(null);
    const sendButtonRef = useRef(null);
    const speakBtnRef = useRef(null);
    const rulesContainerRef = useRef(null);

    const [allRight, setAllRight] = useState(false);
    const [alreadyCelebrated, setAlreadyCelebrated] = useState(false);
    const [typeURL, setTypeURL] = useState(null);

    useTTS(speakBtnRef, rulesContainerRef);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setTypeURL(params.get("type"));

        const decryptedEmail = getDecryptedEmailFromURL();
        if (decryptedEmail) {
            emailRef.current.value = decryptedEmail;
        } else {
            const emailParam = params.get("email");
            if (emailParam) {
                try {
                    emailRef.current.value = decodeURIComponent(emailParam);
                } catch {
                    emailRef.current.value = emailParam;
                }
            }
        }

        validateInput({ target: emailRef.current });
    }, []);

    const decodeFromURL = (encodedText) => {
        let base64 = encodedText.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        return atob(base64);
    };

    const getDecryptedEmailFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        const encryptedEmail = params.get("email");
        const encryptedKey = params.get("key");

        if (encryptedEmail && encryptedKey) {
            try {
                const decodedData = decodeFromURL(encryptedEmail);
                const decodedKey = decodeFromURL(encryptedKey);
                return CryptoJS.AES.decrypt(decodedData, decodedKey).toString(CryptoJS.enc.Utf8);
            } catch (e) {
                console.error("Error al descifrar:", e);
                return null;
            }
        }
        return null;
    };

    const validateInput = (event) => {
        const target = event.target;
        const email = emailRef.current.value.trim();
        const isEmailValid = email !== "" && emailRegex.test(email);

        if (target === emailRef.current) {
            emailRuleRef.current.style.color = isEmailValid ? "green" : "#ff3c00";
            emailRuleRef.current.classList.remove("animate__animated", "animate__headShake");
            void emailRuleRef.current.offsetWidth;
            emailRuleRef.current.classList.add("animate__animated", isEmailValid ? "custom-pulse" : "animate__headShake");
        }

        sendButtonRef.current.disabled = !isEmailValid;
        sendButtonRef.current.classList.toggle("enabled", isEmailValid);
        sendButtonRef.current.style.backgroundColor = isEmailValid ? "#2563eb" : "#ff3c00";
        sendButtonRef.current.style.cursor = isEmailValid ? "pointer" : "not-allowed";

        if (isEmailValid) {
            sendButtonRef.current.classList.add("bounce-animation");
            if (!alreadyCelebrated) {
                setAlreadyCelebrated(true);
                const rect = sendButtonRef.current.getBoundingClientRect();
                const x = (rect.left + rect.right) / 2 / window.innerWidth;
                const y = (rect.top + rect.bottom) / 2 / window.innerHeight;
                confetti({ particleCount: 150, spread: 70, origin: { x, y } });
            }
        } else {
            sendButtonRef.current.classList.remove("bounce-animation");
            setAlreadyCelebrated(false);
        }

        setAllRight(isEmailValid);
    };

    const sendEmail = () => {
        sendButtonRef.current.classList.remove("bounce-animation");

        const data = {
            email: emailRef.current.value,
            type: typeURL,
        };

        fetch(`${API_BASE_URL}/api/users/sendEmail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((res) => {
                if (!res.ok) {
                    formRef.current.classList.add("shake");
                    setTimeout(() => formRef.current.classList.remove("shake"), 400);
                    return res.json().then((message) => {
                        const notyf = new Notyf();
                        notyf.error({
                            message: message.message,
                            duration: 4000,
                            dismissible: true,
                            position: { x: "right", y: "top" },
                        });
                    });
                }

                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                return res.json();
            })
            .then((message) => {
                const notyf = new Notyf();
                notyf.success({
                    message: message.message,
                    duration: 2000,
                    dismissible: true,
                    position: { x: "right", y: "top" },
                });
                setTimeout(() => {
                    navigate('/checkCode');
                }, 2000);
            })
            .catch((err) => {
                console.error("Error:", err);
            });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!allRight) {
            setAlreadyCelebrated(false);
            sendButtonRef.current.classList.remove("bounce-animation");
            formRef.current.classList.add("shake");
            setTimeout(() => formRef.current.classList.remove("shake"), 400);
        } else {
            sendEmail();
        }
    };

    const handleFocus = (e) => {
        e.target.style.border = "1px solid #5057d4";
        e.target.style.outline = "none";
        e.target.style.boxShadow = "0 0 5px #5057d4";
    };

    const handleBlur = (e) => {
        e.target.style.border = "1px solid #3b4550";
        e.target.style.boxShadow = "none";
    };

    const handleDblClick = (e) => {
        e.target.value = "";
        validateInput({ target: e.target });
    };

    return (
        <>
            <fieldset>
                <div className="rules-container" ref={rulesContainerRef}>
                    <div id="rules">
                        <p id="email_rule" ref={emailRuleRef}>
                            <b>Email</b>: Correct formatting
                        </p>
                    </div>
                    <button className="tts-btn" id="speakRulesBtn" ref={speakBtnRef}>
                        <span className="material-symbols-outlined">volume_up</span>
                    </button>
                </div>
            </fieldset>
            <br />
            <fieldset id="checkCode">
                <form id="checkCodeForm" ref={formRef} onSubmit={handleSubmit}>
                    <div id="content1">
                        <label htmlFor="send_email">Email</label>
                        <input
                            type="text"
                            id="send_email"
                            placeholder="email@gmail.com/es"
                            required
                            ref={emailRef}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onInput={validateInput}
                            onDoubleClick={handleDblClick}
                        />
                    </div>
                    <div id="content2">
                        <button
                            type="submit"
                            id="sendEmail"
                            disabled
                            ref={sendButtonRef}
                            style={{ backgroundColor: "#ff5900", cursor: "not-allowed" }}
                        >
                            Send
                        </button>
                    </div>
                </form>
            </fieldset>
        </>
    );
}