import React, { useState, useRef } from 'react';
import ContextMenu from './ContextMenu';
import './ContextMenuExample.scss';

const ContextMenuExample = () => {
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const containerRef = useRef(null);



  // 示例菜单数据
  const menuItems = [
    {
      id: 'copy',
      label: '复制',
      icon: '📋',
      shortcut: 'Ctrl+C',
      selectable: false
    },
    {
      id: 'paste',
      label: '粘贴',
      icon: '📄',
      shortcut: 'Ctrl+V',
      disabled: true,
      selectable: false
    },
    {
      type: 'divider'
    },
    {
      id: 'view',
      label: '查看',
      icon: '👁️',
      children: [
        {
          id: 'view-large',
          label: '大图标',
          group: 'viewMode',
          defaultSelected: true,
          selectable: true
        },
        {
          id: 'view-medium',
          label: '中等图标',
          group: 'viewMode',
          selectable: true
        },
        {
          id: 'view-small',
          label: '小图标',
          group: 'viewMode',
          selectable: true
        },
        {
          type: 'divider'
        },
        {
          id: 'view-list',
          label: '列表视图',
          group: 'viewMode',
          selectable: true
        },
        {
          id: 'view-details',
          label: '详细信息',
          group: 'viewMode',
          selectable: true
        }
      ]
    },
    {
      id: 'sort',
      label: '排序方式',
      icon: '🔄',
      children: [
        {
          id: 'sort-name',
          label: '按名称',
          group: 'sortBy',
          defaultSelected: true,
          selectable: true
        },
        {
          id: 'sort-date',
          label: '按日期',
          group: 'sortBy',
          selectable: true
        },
        {
          id: 'sort-size',
          label: '按大小',
          group: 'sortBy',
          selectable: true
        },
        {
          type: 'divider'
        },
        {
          id: 'sort-order',
          label: '排序选项',
          children: [
            {
              id: 'sort-asc',
              label: '升序',
              group: 'sortOrder',
              defaultSelected: true,
              selectable: true
            },
            {
              id: 'sort-desc',
              label: '降序',
              group: 'sortOrder',
              selectable: true
            }
          ]
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      id: 'new',
      label: '新建',
      icon: '➕',
      children: [
        {
          id: 'new-folder',
          label: '文件夹',
          icon: '📁',
          shortcut: 'Ctrl+Shift+N',
          selectable: false
        },
        {
          id: 'new-file',
          label: '文件',
          icon: '📄',
          shortcut: 'Ctrl+N',
          selectable: false
        },
        {
          type: 'divider'
        },
        {
          id: 'new-document',
          label: '文档',
          icon: '📝',
          selectable: false
        },
        {
          id: 'new-spreadsheet',
          label: '电子表格',
          icon: '📊',
          selectable: false
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      id: 'properties',
      label: '属性',
      icon: 'ℹ️',
      shortcut: 'Alt+Enter',
      selectable: false
    },
    {
      id: 'delete',
      label: '删除',
      icon: '🗑️',
      shortcut: 'Delete',
      selectable: false
    }
  ];

  const handleMenuToggle = (show) => {
    if (typeof show === 'boolean') {
      setContextMenuVisible(show);
    } else {
      // 如果第一个参数不是布尔值，说明是关闭菜单
      setContextMenuVisible(false);
    }
  };

  // 处理菜单项点击
  const handleMenuItemClick = (item) => {
    console.log('菜单项被点击:', item);
    console.log('当前选中状态:', item.selected);
    console.log('所有选中项:', Array.from(item.allSelectedItems || []));
  };



  return (
    <div className="context-menu-example">
      <div className="example-header">
        <h2>Mac风格右键菜单组件示例</h2>
        <p>在下方区域右键点击查看菜单效果</p>
      </div>

      <div
        ref={containerRef}
        className="demo-area"
      >
        <div className="demo-content">
          <div className="demo-item">📁 文件夹 1</div>
          <div className="demo-item">📄 文档.txt</div>
          <div className="demo-item">🖼️ 图片.jpg</div>
          <div className="demo-item">📊 数据.xlsx</div>
          <div className="demo-item">🎵 音乐.mp3</div>
          <div className="demo-item">🎬 视频.mp4</div>
        </div>

        <div className="demo-instructions">
          <p>💡 功能特性：</p>
          <ul>
            <li>✅ Mac风格毛玻璃效果</li>
            <li>✅ 多层级子菜单支持</li>
            <li>✅ 选中状态显示</li>
            <li>✅ 快捷键显示</li>
            <li>✅ 禁用状态支持</li>
            <li>✅ 自动主题适配</li>
            <li>✅ 响应式设计</li>
            <li>✅ 键盘导航支持</li>
          </ul>
        </div>
      </div>

      <ContextMenu
          visible={contextMenuVisible}
          items={menuItems}
          onClose={handleMenuToggle}
          onItemClick={handleMenuItemClick}
          minWidth={200}
          containerRef={containerRef}
          autoAttach={true}
        />
    </div>
  );
};

export default ContextMenuExample;
