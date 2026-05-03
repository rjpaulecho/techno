import { useState, useEffect, useCallback } from "react";
import "./../css/intro.css";

const slides = [
  {
    image: "pics/logo.jpg",
    imageSize: "small",
    text: "Welcome to TutoFriends",
  },
  {
    image: "pics/logo.jpg",
    imageSize: "medium",
    text: "A new way to learn, build, and grow",
  },
  {
    image: "pics/logo.jpg",
    imageSize: "large",
    text: "Simple. Fast. Powerful.",
  },
];

const FADE_DURATION_MS = 350;
const HINT_TEXT = "Click anywhere or press Space / Enter to continue";

type Props = {
  onFinish: () => void;
};

export default function Intro({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const handleClick = useCallback(() => {
    setFade(false);

    setTimeout(() => {
      if (index < slides.length - 1) {
        setIndex((prev) => prev + 1);
        setFade(true);
      } else {
        onFinish();
      }
    }, FADE_DURATION_MS);
  }, [index, onFinish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClick]);

  const { image, imageSize, text } = slides[index];

  return (
    <div className="intro-container" onClick={handleClick}>
      <div className="glow" />

      <div className={`slide ${fade ? "in" : "out"}`}>
        {image && (
          <img
            key={index}
            className={`slide-image slide-image--${imageSize}`}
            src={image}
            alt=""
            draggable={false}
          />
        )}

        <p className="slide-text">{text}</p>
      </div>

      <div className="hint">{HINT_TEXT}</div>
    </div>
  );
}