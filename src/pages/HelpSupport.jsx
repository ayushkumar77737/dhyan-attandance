import React, { useState } from "react";
import "./HelpSupport.css";

const contactData = {
  ashramAddress: "https://maps.app.goo.gl/2YCp1hCbfK66C7mo7",
  supportEmail: "support@jaigurubande.in",
  supportPhone1: "+91 831 858 3110",
  supportPhone2: "+91 9502967959",
  telegramChannel: "https://t.me/+5APCSKB6YC85MjRl",
};

const HelpSupport = () => {
  const [openSection, setOpenSection] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const faqs = [
    {
      id: "faq1",
      question: "How do I contact support?",
      answer:
        "You can reach our support team via email at support@jaigurubande.in or call us at +91 831 858 3110 / +91 9502967959. We're available Monday to Saturday, 9 AM – 6 PM IST.",
    },
    {
      id: "faq2",
      question: "Where is the Ashram located?",
      answer:
        "You can find our Ashram location on Google Maps. Click the Ashram Address link in the Contact section below to get directions directly.",
    },
    {
      id: "faq3",
      question: "How can I join the Telegram channel?",
      answer:
        "Click the Telegram Channel link in the Contact section below. It will redirect you to our official Telegram group where you can stay updated with all announcements.",
    },
    {
      id: "faq4",
      question: "What are the support hours?",
      answer:
        "Our support team is available Monday to Saturday from 9:00 AM to 6:00 PM IST. For urgent matters outside these hours, please use our Telegram channel.",
    },
  ];

  const CopyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const ExternalIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );

  return (
    <div className="hs-wrapper">

      {/* ── Header ── */}
      <div className="hs-header">
        <div className="hs-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h1 className="hs-title">Help &amp; Support</h1>
          <p className="hs-subtitle">We're here to help you. Reach out to us anytime.</p>
        </div>
      </div>

      {/* ── Contact Cards ── */}
      <section className="hs-section">
        <h2 className="hs-section-title">📞 Contact Us</h2>
        <div className="hs-cards-grid">

          {/* Phone 1 */}
          <div className="hs-card hs-card--phone">
            <div className="hs-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="hs-card-content">
              <span className="hs-card-label">Support Phone 1</span>
              <a href={`tel:${contactData.supportPhone1.replace(/\s/g, "")}`} className="hs-card-value">
                {contactData.supportPhone1}
              </a>
            </div>
            <button
              className={`hs-copy-btn ${copiedKey === "phone1" ? "hs-copy-btn--copied" : ""}`}
              onClick={() => handleCopy(contactData.supportPhone1, "phone1")}
              title="Copy"
            >
              {copiedKey === "phone1" ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          {/* Phone 2 */}
          <div className="hs-card hs-card--phone">
            <div className="hs-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="hs-card-content">
              <span className="hs-card-label">Support Phone 2</span>
              <a href={`tel:${contactData.supportPhone2.replace(/\s/g, "")}`} className="hs-card-value">
                {contactData.supportPhone2}
              </a>
            </div>
            <button
              className={`hs-copy-btn ${copiedKey === "phone2" ? "hs-copy-btn--copied" : ""}`}
              onClick={() => handleCopy(contactData.supportPhone2, "phone2")}
              title="Copy"
            >
              {copiedKey === "phone2" ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          {/* Email */}
          <div className="hs-card hs-card--email">
            <div className="hs-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="hs-card-content">
              <span className="hs-card-label">Support Email</span>
              <a href={`mailto:${contactData.supportEmail}`} className="hs-card-value">
                {contactData.supportEmail}
              </a>
            </div>
            <button
              className={`hs-copy-btn ${copiedKey === "email" ? "hs-copy-btn--copied" : ""}`}
              onClick={() => handleCopy(contactData.supportEmail, "email")}
              title="Copy"
            >
              {copiedKey === "email" ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          {/* Telegram */}
          <div className="hs-card hs-card--telegram">
            <div className="hs-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.83.941z" />
              </svg>
            </div>
            <div className="hs-card-content">
              <span className="hs-card-label">Telegram Channel</span>
              <a href={contactData.telegramChannel} target="_blank" rel="noopener noreferrer" className="hs-card-value hs-card-value--link">
                Join our Telegram
              </a>
            </div>
            <a href={contactData.telegramChannel} target="_blank" rel="noopener noreferrer" className="hs-open-btn" title="Open">
              <ExternalIcon />
            </a>
          </div>

          {/* Ashram Address — full width */}
          <div className="hs-card hs-card--location hs-card--full">
            <div className="hs-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="hs-card-content">
              <span className="hs-card-label">Ashram Address</span>
              <a href={contactData.ashramAddress} target="_blank" rel="noopener noreferrer" className="hs-card-value hs-card-value--link">
                View on Google Maps →
              </a>
            </div>
            <a href={contactData.ashramAddress} target="_blank" rel="noopener noreferrer" className="hs-open-btn" title="Open Maps">
              <ExternalIcon />
            </a>
          </div>

        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section className="hs-section">
        <h2 className="hs-section-title">❓ Frequently Asked Questions</h2>
        <div className="hs-faq-list">
          {faqs.map((faq) => (
            <div key={faq.id} className={`hs-faq-item ${openSection === faq.id ? "hs-faq-item--open" : ""}`}>
              <button className="hs-faq-question" onClick={() => toggleSection(faq.id)}>
                <span>{faq.question}</span>
                <span className="hs-faq-chevron">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              <div className="hs-faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="hs-footer-note">
        <p>🕉️ Jai Guru Bande — Serving with devotion &amp; care</p>
      </div>

    </div>
  );
};

export default HelpSupport;