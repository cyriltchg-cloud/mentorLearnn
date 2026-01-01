import React, { useState, useRef, useEffect } from "react";

const API_URL = "http://localhost:5001/api/explain-document";

export default function ChatMentorIA() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Bienvenue ! Envoie une facture/image/PDF/Word : LIA Comptable analyse chaque ligne, calcule la TVA sur la base HT après remise si nécessaire, classe chaque ajustement à part, et extrait toutes les clauses financières/juridiques.",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef();

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else if (file.type === "application/pdf") {
      setFilePreview(URL.createObjectURL(file));
    } else if (file.type.startsWith("text/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsText(file);
    } else {
      setFilePreview(null);
    }
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
    // eslint-disable-next-line
  }, [file]);

  const handleSend = async (e) => {
    e && e.preventDefault();
    if (!userInput.trim() && !file) return;
    setMessages((msgs) => [
      ...msgs,
      {
        role: "user",
        content: file
          ? `📎 Fichier joint : ${file.name}`
          : userInput.trim(),
        filePreview: filePreview ? { url: filePreview, type: file ? file.type : null } : null,
      },
    ]);
    setUserInput("");
    setLoading(true);

    try {
      let res, data;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });
        setFile(null);
        setFilePreview(null);
      } else {
        res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userInput }),
        });
      }
      data = await res.json();

      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: formatFactureReply(data.explication || data.error || "Erreur de traitement côté serveur."),
        },
      ]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: "❌ Oups, un problème est survenu avec le serveur LIA Comptable.",
        },
      ]);
    }
    setLoading(false);
  };

  // Format pro : extrait tableau, ajustements, clauses/mentions
  function formatFactureReply(str) {
    // Trouver le tableau principal
    const tableauRegex = /\|\s*(?:Désignation|Produit|Service|Article).*?\|(?:\n\|.*?\|)+\n\|([^\n]+?\|[^\n]+?\n?)+/gi;
    const tableauMatch = str.match(tableauRegex);

    // Section “Ajustements financiers”
    const ajustementRegex = /(remise commerciale|remise|acompte|frais additionnel|pénalité|escompte)[^\n]*[.:]?[^\n]*\n?/gi;
    const ajustementsRaw = str.match(ajustementRegex);

    // Section “Clauses / mentions juridiques”
    const clausesRegex =
      /(N[°ºo]\s*d’audit|Indexation SYNTEC|Clause d[’e]passement API|Traçabilité lot|Garantie étendue|Clé d’activation IA|Mentions légales|contrat|activation licence|provision|condition|reference|délai de paiement)[^\n]*[.:]?[^\n]*\n?/gi;
    const clausesRaw = str.match(clausesRegex);

    // Section “Récapitulatif : totaux / calculs”
    const recapRegex =
      /(Sous-total HT|Base HT après remise|Remise|TVA [0-9]+%|TOTAL TTC)[^\n]*[.:]?[^\n]*\n?/g;
    const recapRaw = str.match(recapRegex);

    // Section “Commentaires / incohérences”
    const commentRegex =
      /(La TVA ne correspond pas|incohérence|différence|calcul|erreur|explication|méthode|mode de calcul)[^\n]*[.:]?[^\n]*\n?/gi;
    const commentRaw = str.match(commentRegex);

    // Affichage tableau stylé
    let tableContent = null;
    if (tableauMatch) {
      const rows = tableauMatch[0]
        .split("\n")
        .filter((r) => r && r.startsWith("|"))
        .map((r) =>
          r
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        );

      tableContent = (
        <div style={{ margin: "14px 0 10px 0", background: "#0c1918", borderRadius: 10, padding: 10, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {rows[0].map((header, idx) => (
                  <th key={idx} style={{
                    borderBottom: "1.5px solid #37e771",
                    background: "#1f2c2b",
                    color: "#37e771",
                    fontWeight: 700,
                    padding: "6px 10px",
                    textAlign: "left",
                    fontSize: 13,
                    letterSpacing: ".02em"
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, ii) => (
                    <td key={ii} style={{
                      background: "#18181b",
                      color: "#e4e4e7",
                      padding: "5px 10px",
                      fontSize: 13,
                      borderBottom: "1px solid #111118",
                      fontFamily: "monospace"
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const ajustementsSection = ajustementsRaw ? (
      <div style={{
        background: "#263c3f",
        color: "#bef7e6",
        borderRadius: 8,
        padding: "7px 14px",
        marginBottom: 8,
        fontSize: 15,
        fontWeight: 510,
      }}>
        <strong>💶 Ajustements financiers :</strong>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {ajustementsRaw.map((c, k) => (
            <li key={k}>{c}</li>
          ))}
        </ul>
      </div>
    ) : null;

    const clausesSection = clausesRaw ? (
      <div style={{
        background: "#ededf5",
        color: "#3b2e71",
        borderRadius: 8,
        padding: "7px 14px",
        marginBottom: 8,
        fontSize: 15,
        fontWeight: 510,
      }}>
        <strong>📄 Clauses et mentions juridiques :</strong>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {clausesRaw.map((c, k) => (
            <li key={k}>{c}</li>
          ))}
        </ul>
      </div>
    ) : null;

    const recapSection = recapRaw ? (
      <div style={{
        background: "#1a261a",
        color: "#98e792",
        borderRadius: 7,
        padding: "7px 15px",
        marginBottom: 8,
        fontSize: 15
      }}>
        <strong>🧮 Récapitulatif calculs & totaux :</strong>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {recapRaw.map((c, k) => (
            <li key={k}>{c}</li>
          ))}
        </ul>
      </div>
    ) : null;

    const commentSection = commentRaw ? (
      <div style={{
        background: "#ffeae2",
        color: "#a0040d",
        borderRadius: 6,
        padding: "7px 13px",
        marginBottom: 8,
        fontSize: 15,
        fontWeight: 510
      }}>
        <strong>💡 Commentaires et analyse :</strong>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {commentRaw.map((c, k) => (
            <li key={k}>{c}</li>
          ))}
        </ul>
      </div>
    ) : null;

    return (
      <>
        {tableContent}
        {ajustementsSection}
        {recapSection}
        {clausesSection}
        {commentSection}
        <div style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10 }}>
          {str
            .replace(tableauMatch ? tableauMatch[0] : "", "")
            .replace(ajustementRegex, "")
            .replace(clausesRegex, "")
            .replace(recapRegex, "")
            .replace(commentRegex, "")}
        </div>
      </>
    );
  }

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !file) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#090817",
        color: "#e4e4e7",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 970,
          display: "flex",
          flexDirection: "column",
          padding: 18,
          gap: 13,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderRadius: 14,
            background: "linear-gradient(90deg, #142146 55%, #183e27 100%)",
            border: "1px solid #27272a",
            boxShadow: "0 3px 18px #15151d77",
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#b1fb99" }}>
              💼 LIA Comptable — Extraction factures & TVA experte
            </div>
            <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 400 }}>
              Envoie ta facture : LIA catégorise lignes, remises, mentions juridiques, et calcule la TVA sur la base nette après remise !
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#a1a1aa" }}>
            <div style={{
              width: 10, height: 10, borderRadius: 999,
              background: "#33f479", boxShadow: "0 0 8px #33f479", marginRight: 6
            }}></div>
            En ligne
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: 16,
            background: "#10101a",
            borderRadius: 14,
            border: "1px solid #27272a",
            overflowY: "auto",
            minHeight: 340,
            maxHeight: "63vh",
            boxShadow: "0 1px 8px #14142033",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 15,
              }}
            >
              <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "93%",
                }}>
                <div style={{ fontSize: 11, color: "#76c2fa", marginBottom: 4 }}>
                  {msg.role === "user" ? "Vous" : "LIA Comptable"}
                </div>
                <div
                  style={{
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #123d75, #2563eb 82%)"
                        : "#131619",
                    color:
                      msg.role === "user"
                        ? "#fff"
                        : "#fcfcfc",
                    borderRadius: 18,
                    padding: "11px 16px",
                    fontSize: 15,
                    fontWeight: 510,
                    border: msg.role === "assistant" ? "1px solid #183e27" : "none",
                    boxShadow: msg.role === "assistant" ? "0 1px 8px #16e98033" : "none",
                    borderBottomRightRadius: msg.role === "user" ? 6 : 18,
                    borderBottomLeftRadius: msg.role === "assistant" ? 6 : 18,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.filePreview && msg.filePreview.url && (
                    <div style={{ marginBottom: 8 }}>
                      {msg.filePreview.type &&
                        msg.filePreview.type.startsWith("image/") && (
                          <img
                            src={msg.filePreview.url}
                            alt="aperçu"
                            style={{
                              maxHeight: 120,
                              borderRadius: 6,
                              boxShadow: "0 2px 8px #1877672c",
                              marginRight: 6,
                            }}
                          />
                        )}
                      {msg.filePreview.type === "application/pdf" && (
                        <iframe
                          src={msg.filePreview.url}
                          title="Aperçu PDF"
                          style={{
                            width: 200,
                            height: 120,
                            border: "none",
                            borderRadius: 6,
                            boxShadow: "0 2px 8px #1877672c",
                          }}
                        />
                      )}
                      {msg.filePreview.type &&
                        msg.filePreview.type.startsWith("text/") && (
                          <pre
                            style={{
                              fontSize: 13,
                              background: "#1a1c23",
                              color: "#95e1fc",
                              borderRadius: 4,
                              padding: "6px 8px",
                              margin: 0,
                              maxHeight: 80,
                              overflowY: "auto",
                            }}
                          >
                            {msg.filePreview.url}
                          </pre>
                        )}
                    </div>
                  )}
                  <span>{msg.content}</span>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, color: "#76c2fa", marginBottom: 4 }}>
                LIA Comptable
              </div>
              <div
                style={{
                  background: "#18181b",
                  border: "1px solid #242431",
                  color: "#e4e4e7",
                  padding: "11px 17px",
                  borderRadius: 18,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  minHeight: 38,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 15,
                    marginRight: 8,
                  }}
                >
                  Analyse en cours&nbsp;
                  <span className="typing" style={{ display: "inline-block" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "999px",
                        background: "#e95e09",
                        marginRight: 3,
                        animation: "blink 1s infinite alternate",
                      }}
                    ></span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "999px",
                        background: "#e95e09",
                        marginRight: 3,
                        animation: "blink 1s infinite alternate",
                        animationDelay: "0.2s",
                      }}
                    ></span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "999px",
                        background: "#e95e09",
                        marginRight: 3,
                        animation: "blink 1s infinite alternate",
                        animationDelay: "0.4s",
                      }}
                    ></span>
                  </span>
                </span>
                <style>
                  {`@keyframes blink { from {opacity:0.1;transform:translateY(0);} to {opacity:1;transform:translateY(-2px);} }`}
                </style>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input & File */}
        <form
          style={{
            padding: 16,
            background: "#10101a",
            borderRadius: 14,
            border: "1px solid #27272a",
            display: "flex",
            gap: 16,
            alignItems: "end",
            marginTop: 10,
          }}
          onSubmit={handleSend}
        >
          <textarea
            id="input"
            style={{
              flex: 1,
              resize: "none",
              maxHeight: 120,
              minHeight: 32,
              borderRadius: 8,
              border: "1px solid #27272a",
              background: "#191a22",
              color: "#e4e4e7",
              padding: "8px 10px",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              boxShadow: "0 1px 4px #10101922",
            }}
            placeholder="Écris ta question ou envoie un fichier à lire/analyser…"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={loading || file}
            rows={1}
            autoFocus
          />
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            id="file-upload"
            onChange={(e) => setFile(e.target.files[0])}
            disabled={loading}
          />
          <label
            htmlFor="file-upload"
            style={{
              cursor: loading ? "not-allowed" : "pointer",
              background: "#132e1a",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #363f4a",
              color: "#8fedc8",
              fontWeight: 500,
              marginRight: 3,
              opacity: loading ? 0.5 : 1,
              fontSize: 15,
            }}
          >
            📎 Fichier
          </label>
          {file && (
            <span style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 2 }}>
              {file.name}
              &nbsp;
              <span
                style={{ cursor: "pointer", marginLeft: 6 }}
                onClick={() => {
                  setFile(null);
                  setFilePreview(null);
                }}
                title="Supprimer le fichier"
              >
                ❌
              </span>
            </span>
          )}
          <button
            type="submit"
            style={{
              border: "none",
              cursor: loading || (!userInput.trim() && !file) ? "not-allowed" : "pointer",
              padding: "14px 24px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #e95e09, #33f479 85%)",
              color: "#1c1b19",
              fontWeight: 600,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              boxShadow: "0 3px 10px #2e4923b2",
              opacity: loading || (!userInput.trim() && !file) ? 0.5 : 1,
              transition: ".15s",
            }}
            disabled={loading || (!userInput.trim() && !file)}
          >
            ➤ Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}