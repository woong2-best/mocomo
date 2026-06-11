"use client";

import { useEffect, useRef } from "react";
import { useLiveChatOptional } from "@/components/live/live-chat-provider";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import type {
  LiveOverlayQuizProps,
  LiveOverlayWordGuessProps,
} from "@/lib/live-overlays/types";
import {
  isWordGuessCorrect,
  parseQuizChoiceAnswer,
} from "@/lib/live-overlays/quiz-parse";

/** 호스트 — 채팅 답변·타이머로 퀴즈·단어 맞히기 진행 */
export function LiveOverlayGamesBridge() {
  const overlay = useLiveOverlayContextOptional();
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const chat = useLiveChatOptional();
  const processedIds = useRef<Set<string>>(new Set());

  const isHost = overlay?.isHost ?? false;
  const messages = chat?.messages ?? [];

  useEffect(() => {
    if (!isHost) return;

    const id = window.setInterval(() => {
      const ctx = overlayRef.current;
      const update = ctx?.updateWidgetProps;
      if (!update) return;

      const widgets = ctx.state.widgets;
      for (const w of widgets) {
        if (w.type === "quiz") {
          const props = w.props as LiveOverlayQuizProps;
          if (props.phase !== "active" || props.timeLeft <= 0) continue;
          const next = props.timeLeft - 1;
          if (next <= 0) {
            update(w.id, { ...props, phase: "reveal", timeLeft: 0 });
          } else {
            update(w.id, { ...props, timeLeft: next });
          }
        }
        if (w.type === "wordGuess") {
          const props = w.props as LiveOverlayWordGuessProps;
          if (props.phase !== "active" || props.timeLeft <= 0) continue;
          const next = props.timeLeft - 1;
          if (next <= 0) {
            update(w.id, { ...props, phase: "reveal", timeLeft: 0 });
          } else {
            update(w.id, { ...props, timeLeft: next });
          }
        }
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [isHost]);

  useEffect(() => {
    if (!isHost || messages.length === 0) return;

    const ctx = overlayRef.current;
    const update = ctx?.updateWidgetProps;
    if (!update) return;

    const widgets = ctx.state.widgets;
    const activeQuiz = widgets.find(
      (w) => w.type === "quiz" && (w.props as LiveOverlayQuizProps).phase === "active"
    );
    const activeWord = widgets.find(
      (w) => w.type === "wordGuess" && (w.props as LiveOverlayWordGuessProps).phase === "active"
    );

    if (!activeQuiz && !activeWord) return;

    for (const msg of messages) {
      if (processedIds.current.has(msg.id)) continue;
      processedIds.current.add(msg.id);
      if (processedIds.current.size > 400) {
        const arr = [...processedIds.current];
        processedIds.current = new Set(arr.slice(-200));
      }

      if (activeQuiz) {
        const props = activeQuiz.props as LiveOverlayQuizProps;
        if (props.answeredIds.includes(msg.userId)) continue;
        const optionCount = props.options.filter((o) => o.trim()).length || 4;
        const choice = parseQuizChoiceAnswer(msg.content, Math.min(4, optionCount));
        if (choice === null) continue;

        if (choice !== props.correctIndex) continue;

        const scores = [...props.scores];
        const idx = scores.findIndex((s) => s.username === msg.username);
        if (idx >= 0) scores[idx] = { username: msg.username, score: scores[idx].score + props.points };
        else scores.push({ username: msg.username, score: props.points });

        update(activeQuiz.id, {
          ...props,
          scores,
          answeredIds: [...props.answeredIds, msg.userId],
          lastWinner: msg.username,
          phase: "reveal",
          timeLeft: 0,
        });
        continue;
      }

      if (activeWord) {
        const props = activeWord.props as LiveOverlayWordGuessProps;
        if (props.winner) continue;
        const correct = isWordGuessCorrect(msg.content, props.answer);
        const entry = {
          username: msg.username,
          text: correct ? props.answer : msg.content.trim().slice(0, 40),
          correct,
        };
        const recentGuesses = [...props.recentGuesses, entry].slice(-12);
        if (correct) {
          update(activeWord.id, {
            ...props,
            winner: msg.username,
            recentGuesses,
            phase: "reveal",
            timeLeft: 0,
          });
        } else {
          update(activeWord.id, { ...props, recentGuesses });
        }
      }
    }
  }, [isHost, messages]);

  return null;
}
