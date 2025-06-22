import fetch from './fetch';
import { load } from 'cheerio';

// 常量定义
const DOUBAN_BASE_URL = 'https://www.douban.com';
const DOUBAN_SEARCH_URL = `${DOUBAN_BASE_URL}/search`;
const DEFAULT_RATING = '暂无评分';
const REQUEST_TIMEOUT = 15; // 增加超时时间

// 工具函数
const normalizeSearchName = (name) => {
    if (!name || typeof name !== 'string') {
        throw new Error('视频名称不能为空且必须是字符串');
    }
    return name.replace(/\s/g, '').trim();
};

const validateYear = (year) => {
    if (!year) return true; // 年份可选
    const yearNum = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    return yearNum >= 1900 && yearNum <= currentYear + 5;
};

const isSearchUrl = (url) => {
    return url && url.includes(DOUBAN_SEARCH_URL);
};

export default {
    /**
     * 获取豆瓣页面链接
     * @param {string} name 视频名称
     * @param {string|number} year 视频年份
     * @returns {Promise<string>} 豆瓣页面链接，如果没有搜到该视频，返回搜索页面链接
     * @throws {Error} 当参数无效时抛出错误
     */
    async doubanLink(name, year) {
        try {
            // 参数验证
            const nameToSearch = normalizeSearchName(name);
            if (!validateYear(year)) {
                throw new Error('年份格式无效');
            }

            const params = { q: nameToSearch };
            
            // 发起搜索请求
            const data = await fetch.get(DOUBAN_SEARCH_URL, params, false, REQUEST_TIMEOUT);
            
            if (!data) {
                console.warn('豆瓣搜索返回空数据');
                return DOUBAN_SEARCH_URL;
            }

            const $ = load(data);
            let matchedLink = '';
            
            // 查询所有搜索结果，看名字和年代是否相符
            $('div.result').each(function() {
                const linkElement = $(this).find('div>div>h3>a').first();
                const nameInDouban = linkElement.text().replace(/\s/g, '').trim();
                const subjectCast = $(this).find('span.subject-cast').text();
                
                // 精确匹配名称和年份
                if (nameToSearch === nameInDouban && 
                    subjectCast && 
                    year && 
                    subjectCast.includes(String(year))) {
                    const href = linkElement.attr('href');
                    if (href) {
                        matchedLink = href;
                        return false; // 跳出 each 循环
                    }
                }
            });
            
            return matchedLink || DOUBAN_SEARCH_URL;
            
        } catch (error) {
            console.error('获取豆瓣链接失败:', error.message);
            // 发生错误时返回搜索页面而不是抛出异常
            return DOUBAN_SEARCH_URL;
        }
    },
    /**
     * 获取豆瓣评分
     * @param {string} name 视频名称
     * @param {string|number} year 视频年份
     * @returns {Promise<string>} 豆瓣评分，如果获取失败返回默认值
     * @throws {Error} 当参数无效时抛出错误
     */
    async doubanRate(name, year) {
        try {
            // 参数验证
            const nameToSearch = normalizeSearchName(name);
            if (!validateYear(year)) {
                throw new Error('年份格式无效');
            }

            // 获取豆瓣链接
            const link = await this.doubanLink(nameToSearch, year);
            
            // 如果是搜索页面链接，说明没找到具体页面
            if (isSearchUrl(link)) {
                return DEFAULT_RATING;
            }

            // 获取详情页面数据
            const data = await fetch.get(link, null, false, REQUEST_TIMEOUT);
            
            if (!data) {
                console.warn('豆瓣详情页返回空数据');
                return DEFAULT_RATING;
            }

            const $ = load(data);
            
            // 尝试多种选择器获取评分
            const ratingSelectors = [
                '#interest_sectl strong',
                '.rating_num',
                '.ll.rating_num',
                '[property="v:average"]'
            ];
            
            for (const selector of ratingSelectors) {
                const ratingElement = $(selector).first();
                const ratingText = ratingElement.text();
                
                if (ratingText && ratingText.trim()) {
                    const cleanRating = ratingText.replace(/\s/g, '').trim();
                    // 验证评分格式（应该是数字）
                    if (/^\d+(\.\d+)?$/.test(cleanRating)) {
                        return cleanRating;
                    }
                }
            }
            
            return DEFAULT_RATING;
            
        } catch (error) {
            console.error('获取豆瓣评分失败:', error.message);
            return DEFAULT_RATING;
        }
    },
    
    /**
     * 获取豆瓣相关视频推荐列表
     * @param {string} name 视频名称
     * @param {string|number} year 视频年份
     * @param {number} maxCount 最大推荐数量，默认为10
     * @returns {Promise<Array<{title: string, link?: string}>>} 豆瓣相关视频推荐列表
     * @throws {Error} 当参数无效时抛出错误
     */
    async doubanRecommendations(name, year, maxCount = 10) {
        try {
            // 参数验证
            const nameToSearch = normalizeSearchName(name);
            if (!validateYear(year)) {
                throw new Error('年份格式无效');
            }
            
            if (maxCount <= 0 || maxCount > 50) {
                throw new Error('推荐数量应在1-50之间');
            }

            const recommendations = [];
            
            // 获取豆瓣链接
            const link = await this.doubanLink(nameToSearch, year);
            
            // 如果是搜索页面链接，说明没找到具体页面
            if (isSearchUrl(link)) {
                return recommendations;
            }

            // 获取详情页面数据
            const data = await fetch.get(link, null, false, REQUEST_TIMEOUT);
            
            if (!data) {
                console.warn('豆瓣详情页返回空数据');
                return recommendations;
            }

            const $ = load(data);
            
            // 尝试多种选择器获取推荐
            const recommendationSelectors = [
                'div.recommendations-bd div>dl>dd>a',
                '.recommendations-bd a',
                '#recommendations .pic a',
                '.recommendations .title a'
            ];
            
            for (const selector of recommendationSelectors) {
                $(selector).each(function(index, element) {
                    if (recommendations.length >= maxCount) {
                        return false; // 跳出循环
                    }
                    
                    const $element = $(element);
                    const title = $element.text().trim();
                    const href = $element.attr('href');
                    
                    if (title && title.length > 0) {
                        const recommendation = {
                            title: title,
                            ...(href && { link: href.startsWith('http') ? href : `${DOUBAN_BASE_URL}${href}` })
                        };
                        
                        // 避免重复推荐
                        const isDuplicate = recommendations.some(rec => rec.title === title);
                        if (!isDuplicate) {
                            recommendations.push(recommendation);
                        }
                    }
                });
                
                // 如果已经找到足够的推荐，跳出选择器循环
                if (recommendations.length >= maxCount) {
                    break;
                }
            }
            
            return recommendations.slice(0, maxCount);
            
        } catch (error) {
            console.error('获取豆瓣推荐失败:', error.message);
            return [];
        }
    },
};