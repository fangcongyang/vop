import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import './ContextMenu.scss';

const ContextMenu = ({ 
  visible, 
  x, 
  y, 
  items, 
  onClose, 
  onItemClick, 
  className = '', 
  minWidth = 200,
  containerRef = null,
  autoAttach = false
}) => {
  const [submenuState, setSubmenuState] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: x || 0, y: y || 0 });
  const menuRef = useRef(null);
  const submenuTimerRef = useRef({});

  // 从菜单项中提取初始选中项
  const getInitialSelectedItems = useCallback((menuItems) => {
    const selected = new Set();
    
    const processItems = (items) => {
      items.forEach(item => {
        if (item.defaultSelected && item.id) {
          selected.add(item.id);
        }
        if (item.children) {
          processItems(item.children);
        }
      });
    };
    
    processItems(menuItems);
    return selected;
  }, []);

  const [selectedItems, setSelectedItems] = useState(() => getInitialSelectedItems(items));

  // 从菜单项中动态构建选择组
  const buildSelectionGroups = useCallback((menuItems) => {
    const groups = {};
    
    const processItems = (items) => {
      items.forEach(item => {
        if (item.group && item.id) {
          if (!groups[item.group]) {
            groups[item.group] = [];
          }
          groups[item.group].push(item.id);
        }
        if (item.children) {
          processItems(item.children);
        }
      });
    };
    
    processItems(menuItems);
    return groups;
  }, []);

  const selectionGroups = buildSelectionGroups(items);

  // 自动附加右键菜单事件
  useEffect(() => {
    if (autoAttach && containerRef && containerRef.current) {
      const handleContextMenu = (event) => {
        event.preventDefault();
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = minWidth + 20;
        const menuHeight = items.length * 32 + 20;
        
        let finalX = event.clientX;
        let finalY = event.clientY;
        
        // 防止菜单超出边界
        if (finalX + menuWidth > viewportWidth) {
          finalX = Math.max(10, viewportWidth - menuWidth);
        }
        if (finalY + menuHeight > viewportHeight) {
          finalY = Math.max(10, viewportHeight - menuHeight);
        }
        
        setMenuPosition({ x: finalX, y: finalY });
         // 触发显示菜单的回调
         if (onClose) {
           onClose(true, finalX, finalY);
         }
      };
      
      containerRef.current.addEventListener('contextmenu', handleContextMenu);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('contextmenu', handleContextMenu);
        }
      };
    }
  }, [autoAttach, containerRef, items.length, minWidth, onClose]);

  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [visible, onClose]);

  // 清理定时器
  useEffect(() => {
    return () => {
      Object.values(submenuTimerRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // 处理子菜单显示
  const handleSubmenuShow = useCallback((itemId, delay = 300) => {
    // 清除之前的定时器
    if (submenuTimerRef.current[itemId]) {
      clearTimeout(submenuTimerRef.current[itemId]);
    }

    submenuTimerRef.current[itemId] = setTimeout(() => {
      setSubmenuState(prev => ({ ...prev, [itemId]: true }));
    }, delay);
  }, []);

  // 处理子菜单隐藏
  const handleSubmenuHide = useCallback((itemId, delay = 300) => {
    if (submenuTimerRef.current[itemId]) {
      clearTimeout(submenuTimerRef.current[itemId]);
    }

    submenuTimerRef.current[itemId] = setTimeout(() => {
      setSubmenuState(prev => ({ ...prev, [itemId]: false }));
    }, delay);
  }, []);

  // 处理菜单项点击
  const handleItemClick = (item, event) => {
    event.stopPropagation();

    if (item.disabled) return;

    if (item.children && item.children.length > 0) {
      // 有子菜单的项目，切换子菜单显示状态
      const itemId = item.id || item.key;
      setSubmenuState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    } else {
      // 处理选中状态切换
      const itemId = item.id || item.key;
      let newSelectedItems = new Set(selectedItems);
      let isSelected = selectedItems.has(itemId);

      // 检查是否属于互斥选择组
      const groupKey = Object.keys(selectionGroups).find(key => 
        selectionGroups[key].includes(itemId)
      );

      if (groupKey) {
        // 互斥组：先清除同组的其他选项，然后添加当前选项
        selectionGroups[groupKey].forEach(id => {
          newSelectedItems.delete(id);
        });
        newSelectedItems.add(itemId);
        isSelected = true;
      } else if (item.selectable === true) {
        // 普通可选项：切换选中状态
        if (isSelected) {
          newSelectedItems.delete(itemId);
        } else {
          newSelectedItems.add(itemId);
        }
        isSelected = !isSelected;
      }

      setSelectedItems(newSelectedItems);

      // 执行点击回调，传递选中状态信息
      onItemClick && onItemClick({
        ...item,
        selected: isSelected,
        allSelectedItems: newSelectedItems
      }, event);
      
      // 如果不是可选项，关闭菜单
      if (item.selectable !== true) {
        onClose();
      }
    }
  };

  // 处理鼠标进入菜单项
  const handleItemMouseEnter = (item) => {
    const itemId = item.id || item.key;
    setHoveredItem(itemId);
    
    if (item.children && item.children.length > 0) {
      // 清除隐藏定时器
      if (submenuTimerRef.current[itemId]) {
        clearTimeout(submenuTimerRef.current[itemId]);
      }
      handleSubmenuShow(itemId, 150);
    }
  };

  // 处理鼠标离开菜单项
  const handleItemMouseLeave = (item) => {
    const itemId = item.id || item.key;
    
    if (item.children && item.children.length > 0) {
      handleSubmenuHide(itemId, 500); // 增加延迟时间
    }
  };

  // 处理子菜单容器的鼠标事件
  const handleSubmenuMouseEnter = (itemId) => {
    // 鼠标进入子菜单时，清除隐藏定时器
    if (submenuTimerRef.current[itemId]) {
      clearTimeout(submenuTimerRef.current[itemId]);
    }
  };

  const handleSubmenuMouseLeave = (itemId) => {
    // 鼠标离开子菜单时，延迟隐藏
    handleSubmenuHide(itemId, 300);
  };

  // 渲染菜单项
  const renderMenuItem = (item, _level = 0) => {
    const itemId = item.id || item.key;
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedItems.has(itemId);
    const isHovered = hoveredItem === itemId;
    const showSubmenu = submenuState[itemId];

    if (item.type === 'divider') {
      return (
        <div key={itemId} className="context-menu-divider" />
      );
    }

    return (
      <div key={itemId} className="context-menu-item-wrapper">
        <div
          className={`context-menu-item ${
            item.disabled ? 'disabled' : ''
          } ${
            isSelected ? 'selected' : ''
          } ${
            isHovered ? 'hovered' : ''
          }`}
          onClick={(e) => handleItemClick(item, e)}
          onMouseEnter={() => handleItemMouseEnter(item)}
          onMouseLeave={() => handleItemMouseLeave(item)}
        >
          <div className="context-menu-item-content">
            {item.icon && (
              <span className="context-menu-item-icon">{item.icon}</span>
            )}
            <span className="context-menu-item-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-item-shortcut">{item.shortcut}</span>
            )}
            {hasChildren && (
              <span className="context-menu-item-arrow">▶</span>
            )}
          </div>
          {isSelected && (
            <span className="context-menu-item-check">✓</span>
          )}
        </div>

        {hasChildren && showSubmenu && (
          <div 
            className="context-menu-submenu-wrapper"
            onMouseEnter={() => handleSubmenuMouseEnter(itemId)}
            onMouseLeave={() => handleSubmenuMouseLeave(itemId)}
          >
            <ContextMenu
              visible={true}
              x={0}
              y={0}
              items={item.children}
              onClose={() => handleSubmenuHide(itemId, 0)}
              onItemClick={onItemClick}
              className="context-menu-submenu"
              minWidth={minWidth}
            />
          </div>
        )}
      </div>
    );
  };

  if (!visible) return null;

  // 使用传入的坐标或内部状态的坐标
  const position = autoAttach ? menuPosition : { x: x || 0, y: y || 0 };

  return (
    <div
      ref={menuRef}
      className={`context-menu ${className}`}
      style={{
        left: position.x,
        top: position.y,
        minWidth: `${minWidth}px`
      }}
    >
      <div className="context-menu-content">
        {items.map((item, index) => renderMenuItem({ ...item, key: item.key || index }))}
      </div>
    </div>
  );
};

ContextMenu.propTypes = {
  visible: PropTypes.bool.isRequired,
  x: PropTypes.number,
  y: PropTypes.number,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      icon: PropTypes.node,
      shortcut: PropTypes.string,
      disabled: PropTypes.bool,
      selected: PropTypes.bool,
      selectable: PropTypes.bool,
      type: PropTypes.oneOf(['item', 'divider']),
      children: PropTypes.array,
      onClick: PropTypes.func,
      group: PropTypes.string,
      defaultSelected: PropTypes.bool
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onItemClick: PropTypes.func,
  className: PropTypes.string,
  minWidth: PropTypes.number,
  containerRef: PropTypes.object,
  autoAttach: PropTypes.bool
};

export default ContextMenu;
