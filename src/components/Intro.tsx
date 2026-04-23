import { useState } from "react";
import "./../css/intro.css";

type Props = {
  onFinish: () => void;
};

const messages = [
  "Welcome to TutoFriends",
  "A new way to learn, build, and grow",
  "Simple. Fast. Powerful.",
  "Are you ready?",
  "Let’s begin."
];

export default function Intro({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const handleClick = () => {
    setFade(false);

    setTimeout(() => {
      if (index < messages.length - 1) {
        setIndex((prev) => prev + 1);
        setFade(true);
      } else {
        onFinish();
      }
    }, 350);
  };

  return (
    <div className="intro-container" onClick={handleClick}>
      <div className="glow" />

      <div className={`message ${fade ? "in" : "out"}`}>
        {messages[index]}
      </div>

      <div className="hint">Click anywhere to continue</div>
    </div>
  );
}