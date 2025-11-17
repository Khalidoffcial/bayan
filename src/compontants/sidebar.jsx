import React from 'react';
import '../App.css'; // استيراد ملف التنسيق

const Sidebar = () => {
  const channels = [ 'Posts','Articles', 'Novels',];

  return (
    <div className="sidebar">
      <ul className="sidebar-list">
        <a href="/" className="sidebar-item" style={{textDecoration:"none"}}>All</a>
        {channels.map((channel, index) => (
          <a href={`/${channel.toLowerCase()}`} style={{textDecoration:"none"}}>
                <li key={index} className="sidebar-item">{channel}</li>
            </a>
        ))}
      </ul>
        {/* <a href="/" className="sidebar-item" style={{textDecoration:"none"}}>All</a> */}
    </div>
  );
};

export default Sidebar;
