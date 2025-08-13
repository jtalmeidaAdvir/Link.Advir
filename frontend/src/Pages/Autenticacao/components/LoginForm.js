import React from "react";
import RecuperarPasswordLink from "./RecuperarPasswordLink";
import BiometricLoginButton from "./BiometricLoginButton";
import { inputStyle, buttonStyle, errorStyle } from "../styles/LoginFormStyles";

const LoginForm = ({
    email,
    setEmail,
    password,
    setPassword,
    errorMessage,
    handleLogin,
    t,
}) => {
    return (
        <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder={t("Email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                />
            </div>
            <div style={{ marginBottom: "20px" }}>
                <input
                    type="password"
                    placeholder={t("Login.TxtPass")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                />
            </div>

            {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

            <BiometricLoginButton
                email={email}
                onSuccess={(result) => {
                    // Simular o comportamento do login tradicional
                    if (window.handleBiometricSuccess) {
                        window.handleBiometricSuccess(result);
                    }
                }}
                t={t}
            />

            <RecuperarPasswordLink />

            <button type="submit" style={buttonStyle}>
                {t("Login.BtLogin")}
            </button>
        </form>
    );
};

export default LoginForm;