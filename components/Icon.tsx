import React from 'react';
import { motion } from 'motion/react';

interface IconProps {
  name: 'sparkles' | 'download' | 'play' | 'spinner' | 'upload' | 'user' | 'wand' | 'close' | 'film' | 'reload' | 'image' | 'copy' | 'check' | 'thumb-up' | 'thumb-down' | 'plus' | 'loader' | 'alert-circle' | 'x' | 'share-2' | 'arrow-right' | 'camera' | 'pen-tool' | 'zap' | 'dollar-sign' | 'globe' | 'layers' | 'home' | 'arrow-left' | 'chevron-up' | 'chevron-down' | 'heart' | 'coins' | 'shopping-cart' | 'gift' | 'shuffle' | 'settings' | 'history' | 'key';
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className, size = 24 }) => {
  let emoji = '';
  let content: React.ReactNode = null;
  let animateProps: any = {};
  let transitionProps: any = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
  let customizedStyle: React.CSSProperties = {};

  switch (name) {
    case 'settings':
      emoji = '⚙️';
      animateProps = { rotate: 360 };
      transitionProps = { repeat: Infinity, duration: 6, ease: 'linear' };
      break;
    case 'shuffle':
      emoji = '🔀';
      animateProps = { scale: [1, 1.12, 1] };
      transitionProps = { repeat: Infinity, duration: 2.5, ease: 'easeInOut' };
      break;
    case 'coins':
      emoji = '🪙';
      animateProps = { 
        rotateY: [0, 180, 360],
        y: [0, -3, 0]
      };
      transitionProps = { repeat: Infinity, duration: 2.5, ease: 'easeInOut' };
      break;
    case 'shopping-cart':
      emoji = '🛒';
      animateProps = { x: [0, 4, 0] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'gift':
      emoji = '🎁';
      animateProps = { y: [0, -4, 0], scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 1.8, ease: 'easeInOut' };
      break;
    case 'heart':
      emoji = '❤️';
      animateProps = { scale: [1, 1.3, 1.1, 1.4, 1] };
      transitionProps = { repeat: Infinity, duration: 1.2, ease: 'easeInOut' };
      break;
    case 'chevron-up':
      emoji = '🔼';
      animateProps = { y: [0, -2, 0] };
      transitionProps = { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      break;
    case 'chevron-down':
      emoji = '🔽';
      animateProps = { y: [0, 2, 0] };
      transitionProps = { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      break;
    case 'zap':
      emoji = '⚡';
      animateProps = { 
        scale: [1, 1.25, 1],
        filter: [
          'drop-shadow(0 0 1px rgba(234, 179, 8, 0.3))',
          'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))',
          'drop-shadow(0 0 1px rgba(234, 179, 8, 0.3))'
        ]
      };
      transitionProps = { repeat: Infinity, duration: 1.2, ease: 'easeInOut' };
      break;
    case 'dollar-sign':
      emoji = '💰';
      animateProps = { scale: [1, 1.1, 1] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'globe':
      emoji = '🌐';
      animateProps = { rotate: 360 };
      transitionProps = { repeat: Infinity, duration: 12, ease: 'linear' };
      break;
    case 'layers':
      emoji = '🗂️';
      animateProps = { y: [0, -3, 0] };
      transitionProps = { repeat: Infinity, duration: 2.8, ease: 'easeInOut' };
      break;
    case 'arrow-left':
      emoji = '⬅️';
      animateProps = { x: [0, -4, 0] };
      transitionProps = { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      break;
    case 'home':
      emoji = '🏠';
      animateProps = { scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 4, ease: 'easeInOut' };
      break;
    case 'arrow-right':
      emoji = '➡️';
      animateProps = { x: [0, 4, 0] };
      transitionProps = { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      break;
    case 'camera':
      emoji = '📸';
      animateProps = { scale: [1, 1.06, 1] };
      transitionProps = { repeat: Infinity, duration: 3, ease: 'easeInOut' };
      break;
    case 'pen-tool':
      emoji = '✏️';
      animateProps = { rotate: [0, -12, 12, 0] };
      transitionProps = { repeat: Infinity, duration: 2.2, ease: 'easeInOut' };
      break;
    case 'share-2':
      content = (
        <svg 
          viewBox="0 0 24 24" 
          width={size} 
          height={size} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full text-current"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
      animateProps = { scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 2.2, ease: 'easeInOut' };
      break;
    case 'plus':
      emoji = '➕';
      animateProps = { scale: [1, 1.2, 1] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'sparkles':
      emoji = '✨';
      animateProps = { 
        scale: [1, 1.2, 0.95, 1.2, 1],
        rotate: [0, 15, -15, 15, 0]
      };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'download':
      emoji = '📥';
      animateProps = { y: [0, 3, 0] };
      transitionProps = { repeat: Infinity, duration: 1.4, ease: 'easeInOut' };
      break;
    case 'play':
      emoji = '🎬';
      animateProps = { scale: [1, 1.08, 1] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'spinner':
      emoji = '🔄';
      animateProps = { rotate: 360 };
      transitionProps = { repeat: Infinity, duration: 1, ease: 'linear' };
      break;
    case 'loader':
      emoji = '⏳';
      animateProps = { rotate: [0, 180, 180, 360, 360] };
      transitionProps = { repeat: Infinity, duration: 2.2, ease: 'easeInOut' };
      break;
    case 'upload':
      emoji = '📤';
      animateProps = { y: [0, -3, 0] };
      transitionProps = { repeat: Infinity, duration: 1.4, ease: 'easeInOut' };
      break;
    case 'user':
      emoji = '👤';
      animateProps = { scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 3, ease: 'easeInOut' };
      break;
    case 'wand':
      emoji = '🪄';
      animateProps = { 
        rotate: [0, 18, -18, 0],
        x: [0, 3, -3, 0]
      };
      transitionProps = { repeat: Infinity, duration: 1.6, ease: 'easeInOut' };
      break;
    case 'close':
    case 'x':
      emoji = '❌';
      animateProps = { scale: [1, 1.08, 1] };
      transitionProps = { repeat: Infinity, duration: 3, ease: 'easeInOut' };
      break;
    case 'film':
      emoji = '📹';
      animateProps = { scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 2.2, ease: 'easeInOut' };
      break;
    case 'reload':
      emoji = '🔄';
      animateProps = { rotate: [360, 0] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'linear' };
      break;
    case 'image':
      emoji = '🖼️';
      animateProps = { scale: [1, 1.04, 1] };
      transitionProps = { repeat: Infinity, duration: 4, ease: 'easeInOut' };
      break;
    case 'copy':
      emoji = '📋';
      animateProps = { scale: [1, 1.05, 1] };
      transitionProps = { repeat: Infinity, duration: 3, ease: 'easeInOut' };
      break;
    case 'check':
      emoji = '✅';
      animateProps = { scale: [1, 1.15, 1] };
      transitionProps = { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      break;
    case 'thumb-up':
      emoji = '👍';
      animateProps = { y: [0, -3, 0] };
      transitionProps = { repeat: Infinity, duration: 1.2, ease: 'easeInOut' };
      break;
    case 'thumb-down':
      emoji = '👎';
      animateProps = { y: [0, 3, 0] };
      transitionProps = { repeat: Infinity, duration: 1.2, ease: 'easeInOut' };
      break;
    case 'alert-circle':
      emoji = '💡';
      animateProps = { opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] };
      transitionProps = { repeat: Infinity, duration: 1.6, ease: 'easeInOut' };
      break;
    case 'history':
      emoji = '🕒';
      animateProps = { rotate: 360 };
      transitionProps = { repeat: Infinity, duration: 15, ease: 'linear' };
      break;
    case 'key':
      emoji = '🔑';
      animateProps = { scale: [1, 1.08, 1] };
      transitionProps = { repeat: Infinity, duration: 2.5, ease: 'easeInOut' };
      break;
    default:
      emoji = '✨';
  }

  return (
    <motion.span
      className={`inline-flex items-center justify-center select-none ${className || ''}`}
      style={{
        width: size,
        height: size,
        fontSize: content ? undefined : size * 0.9,
        lineHeight: 1,
        ...customizedStyle
      }}
      animate={animateProps}
      transition={transitionProps}
    >
      {content || emoji}
    </motion.span>
  );
};
