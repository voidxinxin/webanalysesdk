 (function() {
     'use strict';
     const SCRIPT_VERSION = 'v1.0-ad-links-detect';
     console.log(`🚀 [AdLinksDetect] 加载广告链接检测脚本 ${SCRIPT_VERSION}`);
     console.log(`🏠 [AdLinksDetect] 当前执行环境: isTop=${window===window.top}, URL=${window.location.href}`);
     console.log('🔍 [AdLinksDetect] iframe环境检查:', {
         isTop: window === window.top,
         hasFrameElement: !!window.frameElement,
         frameElementNull: window.frameElement === null,
         canAccessParent: (() => {
             try {
                 return !!window.parent && window.parent !== window;
             } catch (e) {
                 return false;
             }
         })(),
         origin: window.location.origin,
         protocol: window.location.protocol
     });

     function decodeOriginAdLink(url) {
         if (!url) return "";
         return url.replace(/&amp;/g, "&");
     }

     function isAdLink(url) {
         try {
             let decodedUrl = url;
             const hasAdDomain = (decodedUrl.includes('googleadservices') || decodedUrl.includes('doubleclick') || decodedUrl.includes('googlesyndication') || decodedUrl.includes('appier.net') || decodedUrl.includes('tracenep-eu.admaster.cc') || decodedUrl.includes('creatives.smadex.com') || decodedUrl.includes('trace-eu.mediago.io'));
             const hasAdParams = (decodedUrl.includes('aclk?') || decodedUrl.includes('adurl=') || decodedUrl.includes('xclk?') || decodedUrl.includes('google_click_url') || decodedUrl.includes('adurl'));
             if (hasAdDomain && hasAdParams) return true;
             if (decodedUrl.includes('googleads.g.doubleclick.net/aclk')) return true;
             return (hasAdDomain || hasAdParams) && decodedUrl.includes('adurl=');
         } catch (e) {
             console.log('[AdLinksDetect] isAdLink出错:', e);
             return false;
         }
     }

     function extractTargetUrl(url) {
         try {
             const decodedUrl = url;
             if (decodedUrl.includes('adurl=')) {
                 const adurlMatch = decodedUrl.match(/adurl=([^&]+)/);
                 if (adurlMatch && adurlMatch[1]) return adurlMatch[1];
             }
             if (decodedUrl.includes('ds_dest_url=')) {
                 const destUrlMatch = decodedUrl.match(/ds_dest_url=([^&]+)/);
                 if (destUrlMatch && destUrlMatch[1]) return destUrlMatch[1];
             }
             return url;
         } catch (error) {
             console.log('❌ 提取目标链接失败:', error.message);
             return url;
         }
     }

     function getCurrentFrameAdTypeInfo() {
         try {
             const frameElement = window.frameElement;
             console.log('🔍 [AdLinksDetect] 检查iframe属性:', {
                 hasFrameElement: !!frameElement,
                 isTop: window === window.top,
                 frameElementId: frameElement ? frameElement.id : 'null',
                 frameElementSrc: frameElement ? frameElement.src : 'null',
                 frameElementTagName: frameElement ? frameElement.tagName : 'null',
                 frameElementAttributes: frameElement ? Array.from(frameElement.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ') : 'null'
             });
             if (frameElement) {
                 const adType = frameElement.getAttribute('data-ad-type');
                 const parentInsId = frameElement.getAttribute('data-parent-ins-id');
                 const iframeLevel = frameElement.getAttribute('data-iframe-level');
                 const chainPath = frameElement.getAttribute('data-chain-path');
                 console.log('📋 [AdLinksDetect] iframe属性详情:', {
                     'data-ad-type': adType,
                     'data-parent-ins-id': parentInsId,
                     'data-iframe-level': iframeLevel,
                     'data-chain-path': chainPath,
                     'id': frameElement.id,
                     'className': frameElement.className
                 });
                 return {
                     adType: adType || 'unknown',
                     parentInsId: parentInsId || '',
                     iframeLevel: parseInt(iframeLevel || '0'),
                     chainPath: chainPath || '',
                     iframeId: frameElement.id || '',
                     iframeSrc: window.location.href || ''
                 };
             }
             if (window === window.top) {
                 return {
                     adType: 'main_page',
                     parentInsId: '',
                     iframeLevel: 0,
                     chainPath: 'main_page',
                     iframeId: '',
                     iframeSrc: window.location.href || ''
                 };
             }
         } catch (error) {
             console.log('❌ [AdLinksDetect] 获取当前iframe广告类型信息失败:', error.message);
             const isInIframe = window !== window.top;
             const currentUrl = window.location.href || '';
             let errorInferredAdType = 'unknown';
             if (isInIframe && (currentUrl.includes('googlesyndication.com') || currentUrl.includes('doubleclick.net'))) {
                 errorInferredAdType = 'banner';
             }
             return {
                 adType: errorInferredAdType,
                 parentInsId: '',
                 iframeLevel: isInIframe ? 1 : 0,
                 chainPath: errorInferredAdType !== 'unknown' ? `error-inferred-${errorInferredAdType}` : '',
                 iframeId: '',
                 iframeSrc: currentUrl
             };
         }
     }

     function detectAdLinksWithType() {
         try {
             console.log('🔗 [AdLinksDetect] 开始检测当前iframe中的广告链接并关联广告类型...');
             const frameAdTypeInfo = getCurrentFrameAdTypeInfo();
             console.log('📊 [AdLinksDetect] 当前iframe广告类型信息:', frameAdTypeInfo);
             let adLinks = [];
             const links = document.querySelectorAll('a[href]');
             console.log(`🔍 [AdLinksDetect] 当前iframe中找到 ${links.length} 个链接`);
             links.forEach((link, index) => {
                 try {
                     const href = decodeOriginAdLink(link.href);
                     const isAd = isAdLink(href);
                     if (href && isAd) {
                         if (frameAdTypeInfo.adType === 'native') {
                             const logData = {
                                 href: href,
                                 containerId: frameAdTypeInfo.containerId,
                                 isAdLink: isAd,
                                 linkText: link.textContent?.substring(0, 50) || '无文本',
                                 linkClass: link.className || '无class',
                                 linkId: link.id || '无id',
                                 hasOnClick: !!link.onclick,
                                 hasDataUrl: !!(link.dataset && (link.dataset.url || link.dataset.href)),
                                 parentElement: link.parentElement?.tagName || '无父元素'
                             };
                             console.log(`🎯 [AdLinksDetect] Native广告链接检测 ${index+1}:`, JSON.stringify(logData, null, 2));
                         } else {
                             console.log(`🔗 [AdLinksDetect] 链接 ${index+1}: ${href.substring(0,100)}... -> isAdLink: ${isAd}`);
                         }
                         const targetUrl = extractTargetUrl(href);
                         const linkInfo = {
                             index: index + 1,
                             href: href,
                             targetUrl: targetUrl,
                             hrefLength: href.length,
                             text: link.textContent.trim().substring(0, 100) || '无文本',
                             title: link.title || '无标题',
                             className: link.className || '无class',
                             adType: frameAdTypeInfo.adType,
                             containerId: frameAdTypeInfo.containerId,
                             parentInsId: frameAdTypeInfo.parentInsId,
                             iframeLevel: frameAdTypeInfo.iframeLevel,
                             chainPath: frameAdTypeInfo.chainPath,
                             iframeId: frameAdTypeInfo.iframeId,
                             iframeSrc: frameAdTypeInfo.iframeSrc,
                             timestamp: new Date().toISOString()
                         };
                         adLinks.push(linkInfo);
                         console.log(`✅ [AdLinksDetect] 发现广告链接 ${index+1} (${frameAdTypeInfo.adType}):`, href.substring(0, 100) + '...');
                     }
                 } catch (error) {
                     console.log(`❌ [AdLinksDetect] 处理链接 ${index+1} 失败:`, error.message);
                 }
             });
             if (adLinks.length > 0) {
                 const randomIndex = Math.floor(Math.random() * adLinks.length);
                 adLinks = [adLinks[randomIndex]];
             }
             if (adLinks.length > 0) {
                 console.log(`📤 [AdLinksDetect] 找到 ${adLinks.length} 个广告链接，发送到Swift端`);
                 if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.adUrlDetector) {
                     try {
                         window.webkit.messageHandlers.adUrlDetector.postMessage({
                             type: 'ad_links_with_type',
                             totalLinks: adLinks.length,
                             adLinks: adLinks,
                             frameInfo: frameAdTypeInfo,
                             timestamp: new Date().toISOString(),
                             currentURL: window.location.href
                         });
                         console.log('✅ [AdLinksDetect] 广告链接和类型信息已发送到Swift端');
                     } catch (error) {
                         console.log('❌ [AdLinksDetect] 发送广告链接和类型信息到Swift端失败:', error.message);
                     }
                 } else {
                     console.log('❌ [AdLinksDetect] adUrlDetector 消息处理器不存在');
                 }
             } else {
                 if (frameAdTypeInfo.adType === 'native') {
                     console.log(`⚠️ [AdLinksDetect] Native广告未找到链接，额外调试信息:`, {
                         totalLinks: links.length,
                         allLinksHrefs: Array.from(links).slice(0, 3).map(link => link.href.substring(0, 100)),
                         frameAdType: frameAdTypeInfo.adType,
                         documentReady: document.readyState,
                         bodyContent: document.body.innerHTML.length,
                         hasScripts: document.querySelectorAll('script').length,
                         hasIframes: document.querySelectorAll('iframe').length,
                         chainPath: frameAdTypeInfo.chainPath
                     });
                 } else {
                     console.log('📝 [AdLinksDetect] 当前iframe中未检测到广告链接');
                 }
             }
             return adLinks;
         } catch (error) {
             console.log('❌ [AdLinksDetect] 检测广告链接和类型失败:', error.message);
             return [];
         }
     }
     const adKeywords = ['aclk?', 'xclk?', 'google_click_url', '/ad?dbm_c', 'aclk', 'adurl'];

     function containsAdKeyword(text) {
         return adKeywords.some(keyword => text.includes(keyword));
     }

     function getScriptsInCurrentFrame() {
         const scripts = document.querySelectorAll('script');
         let scriptContents = [];
         const frameAdTypeInfo = getCurrentFrameAdTypeInfo();
         console.log(`🔍 当前iframe中找到 ${scripts.length} 个script标签`);
         scripts.forEach((script, index) => {
             try {
                 const scriptContent = script.innerHTML.trim();
                 const scriptOuterHTML = script.outerHTML;
                 console.log(`🔍 检查script标签 ${index+1}:`, {
                     content: scriptContent.substring(0, 100) + (scriptContent.length > 100 ? '...' : ''),
                     outerHTML: scriptOuterHTML.substring(0, 100) + (scriptOuterHTML.length > 100 ? '...' : ''),
                     hasAclkInContent: scriptContent.includes('aclk?'),
                     hasAclkInOuterHTML: scriptOuterHTML.includes('aclk?')
                 });
                 if (containsAdKeyword(scriptContent) || containsAdKeyword(scriptOuterHTML)) {
                     const hasAclkInContent = containsAdKeyword(scriptContent);
                     const hasAclkInOuterHTML = containsAdKeyword(scriptOuterHTML);
                     if (hasAclkInContent || hasAclkInOuterHTML) {
                         const scriptInfo = {
                             index: index + 1,
                             id: script.id || '',
                             className: script.className || '',
                             type: script.type || 'text/javascript',
                             src: script.src || '',
                             hasContent: scriptContent.length > 0,
                             contentLength: scriptContent.length,
                             content: "",
                             adType: frameAdTypeInfo.adType,
                             containerId: frameAdTypeInfo.containerId,
                             outerHTML: scriptOuterHTML,
                             iframeSrc: window.location.href || '',
                             iframeId: window.frameElement ? window.frameElement.id || '' : '',
                             timestamp: new Date().toISOString(),
                             scriptVersion: SCRIPT_VERSION
                         };
                         scriptContents.push(scriptInfo);
                         console.log(`✅ 确认包含aclk?的script标签 ${index+1}:`, JSON.stringify({
                             id: scriptInfo.id,
                             type: scriptInfo.type,
                             src: scriptInfo.src,
                             contentLength: scriptInfo.contentLength,
                             iframeSrc: scriptInfo.iframeSrc,
                             hasAclk: true,
                             adType: frameAdTypeInfo.adType,
                             aclkInContent: hasAclkInContent,
                             aclkInOuterHTML: hasAclkInOuterHTML
                         }, null, 2));
                     } else {
                         console.log(`❌ 双重检查失败，跳过script标签 ${index+1}`);
                     }
                 } else {
                     console.log(`⏭️ 跳过不包含aclk?的script标签 ${index+1}`);
                 }
             } catch (error) {
                 console.log(`❌ 处理script标签 ${index+1} 失败:`, error.message);
             }
         });
         if (scriptContents.length > 0) {
             const randomIndex = Math.floor(Math.random() * scriptContents.length);
             scriptContents = [scriptContents[randomIndex]];
         }
         if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.adUrlDetector) {
             try {
                 window.webkit.messageHandlers.adUrlDetector.postMessage({
                     type: 'iframe_script_content_result',
                     iframeSrc: window.location.href || '',
                     iframeId: window.frameElement ? window.frameElement.id || '' : '',
                     totalScripts: scriptContents.length,
                     scriptContents: scriptContents,
                     timestamp: new Date().toISOString()
                 });
                 console.log('✅ 包含aclk?的script内容检测结果已发送到Swift端');
             } catch (error) {
                 console.log('❌ 发送script内容检测结果到Swift端失败:', error.message);
             }
         } else {
             console.log('❌ adUrlDetector 消息处理器不存在');
         }
         console.log(`🎯 过滤后找到 ${scriptContents.length} 个包含aclk?的script标签`);
         return scriptContents;
     }

     function autoExecuteAdLinkDetection() {
         let retryCount = 0;
         const maxRetries = 10;

         function retryDetection() {
             retryCount++;
             console.log(`🔄 [AdLinksDetect] 第 ${retryCount} 次尝试检测广告链接...`);
             const frameAdTypeInfo = getCurrentFrameAdTypeInfo();
             if (frameAdTypeInfo.adType === 'unknown' && retryCount < maxRetries) {
                 console.log(`⏳ [AdLinksDetect] 广告类型还未设置，${1000*retryCount}ms后重试...`);
                 setTimeout(retryDetection, 1000 * retryCount);
             } else {
                 console.log(`✅ [AdLinksDetect] 开始最终检测，广告类型: ${frameAdTypeInfo.adType}`);
                 detectAdLinksWithType();
                 getScriptsInCurrentFrame();
             }
         }
         if (window !== window.top) {
             console.log('🔗 [AdLinksDetect] 当前是iframe内部，开始检测广告链接');
             if (document.readyState === 'complete') {
                 setTimeout(retryDetection, 500);
             } else {
                 document.addEventListener('DOMContentLoaded', function() {
                     setTimeout(retryDetection, 500);
                 });
                 window.addEventListener('load', function() {
                     setTimeout(retryDetection, 1000);
                 });
             }
         } else {
             console.log('🏠 [AdLinksDetect] 当前是主页面，跳过广告链接检测');
         }
     }
     let receivedAdTypeInfo = null;
     window.globalAdTypeInfo = null;
     window.addEventListener('message', function(event) {
         if (event.data && event.data.type === 'AD_TYPE_INFO') {
             const isDynamic = event.data.isDynamic ? ' (动态)' : '';
             const attempt = event.data.attempt ? ` [第${event.data.attempt}次]` : '';
             console.log(`�� [AdLinksDetect] 收到父页面发送的广告类型信息${isDynamic}${attempt}:`, JSON.stringify(event.data));
             if (event.data.isDynamic || !receivedAdTypeInfo || receivedAdTypeInfo.adType === 'unknown') {
                 receivedAdTypeInfo = event.data;
                 window.globalAdTypeInfo = event.data;
                 console.log('✅ [AdLinksDetect] 更新广告类型信息:', {
                     adType: event.data.adType,
                     isDynamic: event.data.isDynamic,
                     attempt: event.data.attempt
                 });
                 setTimeout(() => {
                     console.log(`🔄 [AdLinksDetect] 基于postMessage信息执行检测${isDynamic}...`);
                     detectAdLinksWithType();
                     getScriptsInCurrentFrame();
                 }, 100);
                 if (event.data.isDynamic) {
                     setTimeout(() => {
                         console.log('🔄 [AdLinksDetect] 动态iframe延迟检测...');
                         detectAdLinksWithType();
                         getScriptsInCurrentFrame();
                     }, 1000);
                 }
             } else {
                 console.log('ℹ️ [AdLinksDetect] 已有广告类型信息，跳过重复处理');
             }
         }
     });
     const originalGetCurrentFrameAdTypeInfo = getCurrentFrameAdTypeInfo;
     getCurrentFrameAdTypeInfo = function() {
         const savedInfo = receivedAdTypeInfo || window.globalAdTypeInfo;
         if (savedInfo) {
             console.log('✅ [AdLinksDetect] 使用postMessage接收的广告类型信息:', savedInfo);
             return {
                 adType: savedInfo.adType,
                 parentInsId: savedInfo.parentInsId,
                 containerId: savedInfo.containerId,
                 iframeLevel: savedInfo.iframeLevel,
                 chainPath: savedInfo.chainPath,
                 iframeId: savedInfo.iframeId,
                 iframeSrc: window.location.href || ''
             };
         } else {
             console.log('⚠️ [AdLinksDetect] 未收到postMessage信息，尝试从frameElement读取');
             return {
                 adType: 'unknown',
                 parentInsId: '',
                 containerId: '',
                 iframeLevel: 1,
                 chainPath: ``,
                 iframeId: '',
                 iframeSrc: currentUrl
             };
         }
     };

     function startRunScript() {
         if (document.readyState === 'complete') {
             setTimeout(autoExecuteAdLinkDetection, 1500);
             setTimeout(autoExecuteAdLinkDetection, 3000);
         } else {
             document.addEventListener('DOMContentLoaded', function() {
                 setTimeout(autoExecuteAdLinkDetection, 3000);
             });
             window.addEventListener('load', function() {
                 setTimeout(autoExecuteAdLinkDetection, 2000);
                 setTimeout(autoExecuteAdLinkDetection, 3000);
             });
         }
     }
     try {
         window.PPP_AdLinksDetectScript = {
             detectAdLinksWithType: detectAdLinksWithType,
             autoExecuteAdLinkDetection: autoExecuteAdLinkDetection,
             getCurrentFrameAdTypeInfo: getCurrentFrameAdTypeInfo,
             isAdLink: isAdLink,
             scriptVersion: SCRIPT_VERSION,
             loadedAt: new Date().toISOString()
         };
     } catch (error) {
         console.log('❌ [AdLinksDetect] 暴露全局对象失败:', error.message);
     }
     startRunScript();
 })();
