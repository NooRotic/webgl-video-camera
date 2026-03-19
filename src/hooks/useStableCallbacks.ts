import { useRef } from "react";
import { BaseWebGLVideoProps } from "../types";

type CallbackProps = Pick<BaseWebGLVideoProps, "onReady" | "onError" | "onVideoElement">;

/**
 * Stores callback props in refs and syncs on every render.
 * Keeps callbacks out of useEffect dependency arrays so WebGL scenes
 * aren't torn down when a parent re-renders with new function references.
 */
export function useStableCallbacks(props: CallbackProps) {
  const onReadyRef = useRef(props.onReady);
  const onErrorRef = useRef(props.onError);
  const onVideoElementRef = useRef(props.onVideoElement);
  onReadyRef.current = props.onReady;
  onErrorRef.current = props.onError;
  onVideoElementRef.current = props.onVideoElement;
  return { onReadyRef, onErrorRef, onVideoElementRef };
}
