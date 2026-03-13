import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '../../hooks';
import { Button, Icon } from '../ui';
import './InstagramFeed.css';

interface InstagramPost {
  id: string;
  image: string;
  link: string;
  caption?: string;
}

interface InstagramSettings {
  handle: string;
  posts: InstagramPost[];
}

/**
 * InstagramFeed component
 * 从后台 API 获取配置，展示手动上传的 Instagram 图片
 */
const InstagramFeed: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [settings, setSettings] = useState<InstagramSettings>({
    handle: 'familyfriendshibachi',
    posts: [],
  });
  const [loading, setLoading] = useState(true);

  // 从 API 获取 Instagram 设置
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/instagram');
      const result = await response.json();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to fetch Instagram settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 如果没有配置帖子，不显示此组件
  if (!loading && settings.posts.length === 0) {
    return null;
  }

  return (
    <section className="instagram-feed" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`instagram-container ${isVisible ? 'visible' : ''}`}>
        <div className="instagram-header">
          <h2>{t('instagram.title')}</h2>
          <a
            href={`https://instagram.com/${settings.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="instagram-handle"
          >
            @{settings.handle}
          </a>
        </div>

        {loading ? (
          <div className="instagram-loading">
            <div className="instagram-loading-spinner" />
          </div>
        ) : (
          <div className="instagram-grid">
            {settings.posts.map((post, index) => (
              <a
                key={post.id}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-post"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <img src={post.image} alt={post.caption || `Instagram post ${index + 1}`} />
                <div className="instagram-overlay">
                  <span className="instagram-icon-view">↗</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="instagram-cta">
          <Button
            as="a"
            href={`https://instagram.com/${settings.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="lg"
          >
            <Icon name="camera" size={16} /> {t('instagram.followUs')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;
