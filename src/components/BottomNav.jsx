import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { togglePageActive } from '@/store/coreSlice';
import './BottomNav.scss';

const BottomNav = ({ value }) => {
  const dispatch = useAppDispatch();

  const handleNavClick = (newValue) => {
    dispatch(togglePageActive(newValue));
  };

  return (
    <div className="bottom-nav">
      <div 
        className={`bottom-nav-item ${value === 'movie' ? 'active' : ''}`}
        onClick={() => handleNavClick('movie')}
      >
        <span className="bottom-nav-label">影视</span>
      </div>
      <div 
        className={`bottom-nav-item ${value === 'play' ? 'active' : ''}`}
        onClick={() => handleNavClick('play')}
      >
        <span className="bottom-nav-label">播放</span>
      </div>
      <div 
        className={`bottom-nav-item ${value === 'history' ? 'active' : ''}`}
        onClick={() => handleNavClick('history')}
      >
        <span className="bottom-nav-label">历史</span>
      </div>
      <div 
        className={`bottom-nav-item ${value === 'star' ? 'active' : ''}`}
        onClick={() => handleNavClick('star')}
      >
        <span className="bottom-nav-label">收藏</span>
      </div>
      <div 
        className={`bottom-nav-item ${value === 'settings' ? 'active' : ''}`}
        onClick={() => handleNavClick('settings')}
      >
        <span className="bottom-nav-label">设置</span>
      </div>
    </div>
  );
};

export default BottomNav;