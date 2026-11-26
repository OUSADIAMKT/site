import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./plataforma.css";
import "./crm.css";
// Por último: é a folha que decide a cor dos temas gold, blue e light.
// Não toca em claro nem em escuro, que continuam vindo de plataforma.css.
import "./temas.css";
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
