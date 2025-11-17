import React from 'react';
import facebook from "../image/facebook.png";
import whatsapp from "../image/apple.png";
import telegram from "../image/telegram.png";
import linkedin from "../image/linkedin.png";
import x from "../image/twitter.png";
import { li } from 'framer-motion';

const SocialShare = ({ title, text, url, platforms = ['facebook', 'twitter', 'whatsapp'] }) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`,
    telegram: `https://telegram.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  return (
    <div className='socialshared' >
      {platforms.includes('facebook') && (
        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          فيسبوك
          <img src={facebook}/>
        </a>
      )}
      {platforms.includes('twitter') && (
        <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          تويتر
          <img src={x}/>

        </a>
      )}
      {platforms.includes('whatsapp') && (
        <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          واتساب
          <img src={whatsapp}/>

        </a>
      )}
      {platforms.includes('linkedin') && (
        <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          لينكدإن
          <img src={linkedin}/>

        </a>
      )}
      {platforms.includes('telegram') && (
        <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          تيليجرام
          <img src={telegram}/>

        </a>
      )}
    </div>
  );
};

const buttonStyle = {
  padding: '8px 15px',
  backgroundColor: '#1976d2',
  color: 'white',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
  width:"30px"
};

export default SocialShare;