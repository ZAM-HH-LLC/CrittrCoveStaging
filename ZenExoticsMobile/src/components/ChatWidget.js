import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const ChatWidget = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Initialize Chatbase
      if (!window.chatbase || window.chatbase("getState") !== "initialized") {
        window.chatbase = (...args) => {
          if (!window.chatbase.q) {
            window.chatbase.q = [];
          }
          window.chatbase.q.push(args);
        };
        
        window.chatbase = new Proxy(window.chatbase, {
          get(target, prop) {
            if (prop === "q") {
              return target.q;
            }
            return (...args) => target(prop, ...args);
          }
        });

        // Create and append the script
        const script = document.createElement("script");
        script.src = "https://www.chatbase.co/embed.min.js";
        script.id = "gojPHMEVHUreQvOBHO7Tc";
        script.domain = "www.chatbase.co";
        document.body.appendChild(script);
      }
    }
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <></>
  );
};

export default ChatWidget; 