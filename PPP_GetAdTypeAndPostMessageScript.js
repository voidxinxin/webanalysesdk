// 全局存储iframe广告类型映射关系
window.iframeAdTypeMap = window.iframeAdTypeMap || new Map();

// 存储iframe层级关系的映射
window.iframeHierarchyMap = window.iframeHierarchyMap || new Map();

/**
 * 为 iframe 生成唯一标识符
 * @param {HTMLIFrameElement} iframe - iframe 元素
 * @returns {string} 唯一标识符
 */
function getIframeUniqueId(iframe) {
    if (!iframe || iframe.tagName !== 'IFRAME') {
        return 'invalid_iframe';
    }
    const parts = [
        iframe.id || '',
        iframe.src || '',
        iframe.className || '',
        iframe.getAttribute('data-google-container-id') || ''
    ];
    return parts.join('|').replace(/\s+/g, '_') || 'iframe_empty';
}

function getAdType() {
    try {
        console.log('🔍 开始检测广告类型...');
        console.log('📍 当前页面URL:', window.location.href);
        console.log('📍 是否在iframe中:', window !== window.top);
        console.log('📍 当前iframe层级:', window.frameElement ? 'iframe内部' : '主页面');
        const localInsElements = document.querySelectorAll('ins');
        const adDetectionResults = [];
        let insElements;
        let divAdElements;
        try {
            if (window !== window.top) {
                insElements = window.top.document.querySelectorAll('ins');
                let allDivs = window.top.document.querySelectorAll('div[class*="adx-banner"], div[class*="banner"], div[data-slot*="banner"], div[data-size-desktop], div[data-google-container-id], div[id*="google_ads_iframe"], div[id*="blocks-advanced-column"]');
                divAdElements = Array.from(allDivs).filter(div => !div.closest("ins"));
            } else {
                insElements = document.querySelectorAll('ins');
                let allDivs = document.querySelectorAll('div[class*="adx-banner"], div[class*="banner"], div[data-slot*="banner"], div[data-size-desktop], div[data-google-container-id], div[id*="google_ads_iframe"], div[id*="blocks-advanced-column"');
                divAdElements = Array.from(allDivs).filter(div => !div.closest("ins"));
            }
        } catch (error) {
            insElements = document.querySelectorAll('ins');
            let allDivs = document.querySelectorAll('div[class*="adx-banner"], div[class*="banner"], div[data-slot*="banner"], div[data-size-desktop], div[data-google-container-id], div[id*="blocks-advanced-column"');
            divAdElements = Array.from(allDivs).filter(div => !div.closest("ins"));
        }
        console.log(`📊 开始处理 ${insElements.length} 个<ins>标签，${divAdElements.length} 个<div>广告标签`);
        console.log('🔍 额外检查：用不同方法查找ins标签');
        const allIns1 = document.getElementsByTagName('ins');
        const allIns2 = document.querySelectorAll('ins');
        const allIns3 = document.body ? document.body.querySelectorAll('ins') : [];
        console.log('📊 不同方法找到的ins数量:');
        console.log('  - getElementsByTagName:', allIns1.length);
        console.log('  - document.querySelectorAll:', allIns2.length);
        console.log('  - body.querySelectorAll:', allIns3.length);
        console.log('🔍 调试：所有找到的ins标签:');
        for (let i = 0; i < insElements.length; i++) {
            const ins = insElements[i];
            console.log(`  ins ${i + 1}:`, {
                id: ins.id || '无ID',
                className: ins.className || '无class',
                tagName: ins.tagName,
                hasParent: !!ins.parentElement,
                parentTagName: ins.parentElement?.tagName || '无父元素',
                hasChildren: ins.children.length > 0,
                childrenCount: ins.children.length,
                innerHTML_length: ins.innerHTML.length
            });
        }
        insElements.forEach((insElement, index) => {
            try {
                const hasContent = insElement.children.length > 0 || insElement.innerHTML.trim().length > 0 || insElement.textContent.trim().length > 0;
                let adType = 'unknown';
                if (insElement.hasAttribute('data-slotcar-interstitial')) {
                    adType = 'interstitial';
                } else if (insElement.getAttribute('data-vignette-loaded') || insElement.getAttribute('data-vignette-loaded') === 'true') {
                    adType = 'vignette';
                } else if (insElement.getAttribute('data-slotcar-rewarded')) {
                    adType = 'rewarded';
                } else if (insElement.getAttribute('data-anchor-shown') === 'true' || insElement.getAttribute('data-anchor-status') === 'displayed' || insElement.getAttribute('data-anchor-status') === 'ready-to-display') {
                    adType = 'banner';
                } else if (insElement.id && insElement.id.includes('interstitial')) {
                    const style = insElement.getAttribute('style') || '';
                    if (style.includes('100vw') && style.includes('100vh')) {
                        adType = 'interstitial';
                        console.log(`✅ ins标签 ${index + 1} 识别为 interstitial (ID+全屏样式)`);
                    } else {
                        adType = 'interstitial';
                        console.log(`✅ ins标签 ${index + 1} 识别为 interstitial (基于ID)`);
                    }
                } else if (insElement.id && insElement.id.includes('vignette')) {
                    adType = 'vignette';
                } else if (insElement.id && insElement.id.includes('rewarded')) {
                    adType = 'rewarded';
                } else if (insElement.id && insElement.id.includes('anchor')) {
                    adType = 'banner';
                } else if (insElement.closest('div.google-auto-placed') || (insElement.parentElement && insElement.parentElement.classList.contains('google-auto-placed'))) {
                    adType = 'native';
                    console.log(`✅ ins标签 ${index + 1} 识别为 native (在google-auto-placed div下)`);
                } else if (insElement.classList.contains('adsbygoogle') || insElement.hasAttribute('data-ad-client')) {
                    const style = insElement.getAttribute('style') || '';
                    let width = 0;
                    let height = 0;
                    const widthMatch = style.match(/width:\s*(\d+)px/);
                    const heightMatch = style.match(/height:\s*(\d+)px/);
                    if (widthMatch && heightMatch) {
                        width = parseInt(widthMatch[1]);
                        height = parseInt(heightMatch[1]);
                        if (width > height * 2) {
                            adType = 'banner';
                            console.log(`✅ ins标签 ${index + 1} 识别为 banner (横幅尺寸特征: ${width}x${height})`);
                        } else {
                            adType = 'native';
                            console.log(`✅ ins标签 ${index + 1} 识别为 native (AdSense其他尺寸: ${width}x${height})`);
                        }
                    } else {
                        adType = 'native';
                        console.log(`✅ ins标签 ${index + 1} 识别为 native (AdSense默认)`);
                    }
                } else if (insElement.getAttribute('style')) {
                    const style = insElement.getAttribute('style');
                    if (style.includes('100vw') && style.includes('100vh') && style.includes('position: fixed')) {
                        adType = 'interstitial';
                        console.log(`✅ ins标签 ${index + 1} 识别为 interstitial (全屏样式特征)`);
                    }
                } else {
                    adType = 'unknown';
                }
                console.log(`⚠️ ins标签 ${index + 1} 的广告类型是:`, adType);
                const insInfo = {
                    index: index + 1,
                    id: insElement.id || '',
                    tagName: insElement.tagName,
                    outerHTML: '',
                    adType: adType,
                    dataAttributes: {},
                    iframes: [],
                    hasContent: hasContent,
                    childrenCount: insElement.children.length,
                    innerHTMLLength: insElement.innerHTML.trim().length,
                    textContentLength: insElement.textContent.trim().length,
                    elementType: 'ins'
                };
                const dataAttributes = {};
                for (let attr of insElement.attributes) {
                    if (attr.name.startsWith('data-')) {
                        dataAttributes[attr.name] = attr.value;
                    }
                }
                insInfo.dataAttributes = dataAttributes;
                const iframes = insElement.querySelectorAll('iframe');
                iframes.forEach((iframe, iframeIndex) => {
                    const isGoogleAdServer = iframe.src && iframe.src.includes('googleads.g.doubleclick.net');
                    const containerId = getIframeUniqueId(iframe);
                    const queryId = iframe.getAttribute('data-google-query-id') || '';
                    const parentDivClass = insElement.closest('div.google-auto-placed')?.className || '';
                    const chainId = `${adType}-level1-${Date.now()}-${iframeIndex}`;
                    if (!iframe.id) {
                        iframe.id = chainId;
                    }
                    iframe.setAttribute('data-ad-type', adType);
                    iframe.setAttribute('data-parent-ins-id', insElement.id || '');
                    iframe.setAttribute('data-iframe-level', '1');
                    iframe.setAttribute('data-chain-path', chainId);
                    console.log(`✅ [AdTypeDetect] 为iframe设置广告类型属性:`, {
                        iframeId: iframe.id,
                        adType: adType,
                        parentInsId: insElement.id || '',
                        chainPath: chainId,
                        iframeSrc: iframe.src
                    });
                    console.log(`🔍 [AdTypeDetect] 验证iframe属性设置:`, {
                        'data-ad-type': iframe.getAttribute('data-ad-type'),
                        'data-parent-ins-id': iframe.getAttribute('data-parent-ins-id'),
                        'data-iframe-level': iframe.getAttribute('data-iframe-level'),
                        'data-chain-path': iframe.getAttribute('data-chain-path')
                    });
                    const sendMessageWithRetry = (retryCount = 0) => {
                        try {
                            if (iframe.contentWindow) {
                                const messageData = {
                                    type: 'AD_TYPE_INFO',
                                    adType: adType,
                                    containerId: containerId,
                                    parentInsId: insElement.id || '',
                                    iframeLevel: 1,
                                    chainPath: chainId,
                                    iframeId: iframe.id || '',
                                    timestamp: new Date().toISOString(),
                                    retryCount: retryCount
                                };
                                iframe.contentWindow.postMessage(messageData, '*');
                                console.log(`📤 [AdTypeDetect] 通过postMessage发送广告类型到iframe: ${adType} (重试${retryCount}次)`);
                                if (retryCount < 5) {
                                    setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000 * (retryCount + 1));
                                }
                            }
                        } catch (error) {
                            console.log(`❌ [AdTypeDetect] postMessage发送失败 (重试${retryCount}):`, error.message);
                            if (retryCount < 3) {
                                setTimeout(() => sendMessageWithRetry(retryCount + 1), 2000);
                            }
                        }
                    };
                    sendMessageWithRetry(0);
                    setTimeout(() => sendMessageWithRetry(0), 500);
                    setTimeout(() => sendMessageWithRetry(0), 1500);
                    setTimeout(() => sendMessageWithRetry(0), 3000);
                    const iframeInfo = {
                        index: iframeIndex + 1,
                        id: iframe.id || '',
                        chainId: chainId,
                        className: iframe.className || '',
                        src: iframe.src || '',
                        adType: adType,
                        parentInsId: insElement.id || '',
                        parentInsAdType: adType,
                        isGoogleAdServer: isGoogleAdServer,
                        containerId: containerId,
                        queryId: queryId,
                        parentDivClass: parentDivClass,
                        width: iframe.width || iframe.style.width || '',
                        height: iframe.height || iframe.style.height || '',
                        level: 1,
                        chainPath: chainId
                    };
                    if (isGoogleAdServer && containerId) {
                        const googleAdKey = `google_${containerId}_${queryId}`;
                        const iframeSrcKey = iframe.src || '';
                        const iframeIdKey = iframe.id || '';
                        const mappingData = {
                            adType: adType,
                            parentInsId: insElement.id || '',
                            parentInsAdType: adType,
                            level: 1,
                            source: 'google-auto-placed',
                            iframeId: iframe.id,
                            containerId: containerId,
                            queryId: queryId,
                            parentDivClass: parentDivClass,
                            isGoogleAdServer: true,
                            width: iframe.width || iframe.style.width || '',
                            height: iframe.height || iframe.style.height || '',
                            timestamp: new Date().toISOString()
                        };
                        window.iframeAdTypeMap.set(googleAdKey, mappingData);
                        if (iframeSrcKey) window.iframeAdTypeMap.set(iframeSrcKey, mappingData);
                        if (iframeIdKey) window.iframeAdTypeMap.set(iframeIdKey, mappingData);
                        console.log(`✅ 建立Google AdSense iframe映射关系: ${googleAdKey} -> ${adType} (容器ID: ${containerId})`);
                        console.log(`✅ 同时建立src映射: ${iframeSrcKey} -> ${adType}`);
                        console.log(`✅ 同时建立ID映射: ${iframeIdKey} -> ${adType}`);
                    } else {
                        const iframeKey = iframe.src || iframe.id;
                        if (iframeKey) {
                            window.iframeAdTypeMap.set(iframeKey, {
                                adType: adType,
                                parentInsId: insElement.id || '',
                                parentInsAdType: adType,
                                level: 1,
                                source: 'standard',
                                isGoogleAdServer: false,
                                timestamp: new Date().toISOString()
                            });
                            console.log(`✅ 建立标准iframe映射关系: ${iframeKey} -> ${adType}`);
                        }
                    }
                    insInfo.iframes.push(iframeInfo);
                });
                adDetectionResults.push(insInfo);
            } catch (error) {
                console.log(`❌ 检测ins标签 ${index + 1} 失败:`, error.message);
            }
        });
        console.log('🔍 开始处理div广告标签...');
        divAdElements.forEach((divElement, index) => {
            try {
                let adType = 'unknown';
                if ((divElement.className && (divElement.className.includes('adx-banner') || divElement.className.includes('adsbygoogle') || divElement.className.includes('ad-container') || divElement.className.includes('ad-wrapper') || divElement.className.includes('ad-unit'))) || (divElement.id && divElement.id.includes('google_ads_iframe')) || (divElement.id && divElement.id.includes('blocks-advanced-column'))) {
                    adType = 'native';
                    if (divElement.className && (divElement.className.includes('adx-banner') || divElement.className.includes('adsbygoogle') || divElement.className.includes('ad-container') || divElement.className.includes('ad-wrapper') || divElement.className.includes('ad-unit'))) {
                        console.log(`✅ div标签 ${index + 1} 识别为 native (class特征: ${divElement.className})`);
                    } else if (divElement.id && divElement.id.includes('google_ads_iframe')) {
                        console.log(`✅ div标签 ${index + 1} 识别为 native (ID特征: ${divElement.id})`);
                    }
                } else if (divElement.getAttribute('data-slot') && divElement.getAttribute('data-slot').includes('banner')) {
                    adType = 'native';
                    console.log(`✅ div标签 ${index + 1} 识别为 native (data-slot特征)`);
                } else if (divElement.hasAttribute('data-ad-client')) {
                    adType = 'native';
                    console.log(`✅ div标签 ${index + 1} 识别为 native (data-ad-client特征)`);
                } else if (divElement.querySelector('[data-ad-client], [data-ad-slot], .adsbygoogle')) {
                    adType = 'native';
                    console.log(`✅ div标签 ${index + 1} 识别为 native (包含AdSense元素)`);
                }
                console.log(`⚠️ div标签 ${index + 1} 的广告类型是:`, adType);
                const divInfo = {
                    index: insElements.length + index + 1,
                    id: divElement.id || '',
                    tagName: divElement.tagName,
                    outerHTML: '',
                    adType: adType,
                    dataAttributes: {},
                    iframes: [],
                    childrenCount: divElement.children.length,
                    innerHTMLLength: divElement.innerHTML.length,
                    textContentLength: divElement.textContent.trim().length,
                    elementType: 'div'
                };
                const dataAttributes = {};
                for (let attr of divElement.attributes) {
                    if (attr.name.startsWith('data-')) {
                        dataAttributes[attr.name] = attr.value;
                    }
                }
                divInfo.dataAttributes = dataAttributes;
                const iframes = divElement.querySelectorAll('iframe');
                iframes.forEach((iframe, iframeIndex) => {
                    const chainId = `${adType}-div-level1-${Date.now()}-${iframeIndex}`;
                    const containerId = getIframeUniqueId(iframe);
                    if (!iframe.id) {
                        iframe.id = chainId;
                    }
                    iframe.setAttribute('data-ad-type', adType);
                    iframe.setAttribute('data-parent-ins-id', divElement.id || '');
                    iframe.setAttribute('data-iframe-level', '1');
                    iframe.setAttribute('data-chain-path', chainId);
                    console.log(`✅ [AdTypeDetect] 为div中的iframe设置广告类型属性:`, {
                        iframeId: iframe.id,
                        adType: adType,
                        parentDivId: divElement.id || '',
                        chainPath: chainId,
                        iframeSrc: iframe.src
                    });
                    console.log(`🔍 [AdTypeDetect] 验证div中iframe属性设置:`, {
                        'data-ad-type': iframe.getAttribute('data-ad-type'),
                        'data-parent-ins-id': iframe.getAttribute('data-parent-ins-id'),
                        'data-iframe-level': iframe.getAttribute('data-iframe-level'),
                        'data-chain-path': iframe.getAttribute('data-chain-path')
                    });
                    const sendDivMessageWithRetry = (retryCount = 0) => {
                        try {
                            if (iframe.contentWindow) {
                                const messageData = {
                                    type: 'AD_TYPE_INFO',
                                    adType: adType,
                                    containerId: containerId,
                                    parentInsId: divElement.id || '',
                                    iframeLevel: 1,
                                    chainPath: chainId,
                                    iframeId: iframe.id || '',
                                    timestamp: new Date().toISOString(),
                                    retryCount: retryCount,
                                    parentType: 'div'
                                };
                                iframe.contentWindow.postMessage(messageData, '*');
                                console.log(`📤 [AdTypeDetect] 通过postMessage发送div广告类型到iframe: ${adType} (重试${retryCount}次)`);
                                if (retryCount < 5) {
                                    setTimeout(() => sendDivMessageWithRetry(retryCount + 1), 1000 * (retryCount + 1));
                                }
                            }
                        } catch (error) {
                            console.log(`❌ [AdTypeDetect] div postMessage发送失败 (重试${retryCount}):`, error.message);
                            if (retryCount < 3) {
                                setTimeout(() => sendDivMessageWithRetry(retryCount + 1), 2000);
                            }
                        }
                    };
                    sendDivMessageWithRetry(0);
                    setTimeout(() => sendDivMessageWithRetry(0), 500);
                    setTimeout(() => sendDivMessageWithRetry(0), 1500);
                    setTimeout(() => sendDivMessageWithRetry(0), 3000);
                    const iframeInfo = {
                        index: iframeIndex + 1,
                        id: iframe.id || '',
                        chainId: chainId,
                        className: iframe.className || '',
                        src: iframe.src || '',
                        adType: adType,
                        parentDivId: divElement.id || '',
                        level: 1,
                        chainPath: chainId
                    };
                    divInfo.iframes.push(iframeInfo);
                });
                adDetectionResults.push(divInfo);
            } catch (error) {
                console.log(`❌ 检测div标签 ${index + 1} 失败:`, error.message);
            }
        });
        const adTypeStats = {};
        let validInsCount = 0;
        let validAdTypeCount = 0;
        adDetectionResults.forEach(result => {
            if (result.hasContent) {
                if (result.elementType === 'ins') {
                    validInsCount++;
                }
                if (result.adType !== 'unknown') {
                    adTypeStats[result.adType] = (adTypeStats[result.adType] || 0) + 1;
                    validAdTypeCount++;
                }
            }
        });

        function sendToSwift(handlerName, messageData) {
            try {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[handlerName]) {
                    window.webkit.messageHandlers[handlerName].postMessage(messageData);
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }
        try {
            if (adDetectionResults.length === 0) {
                const noAdMessage = {
                    type: 'no_ads_detected',
                    totalElements: 0,
                    adDetectionResults: [],
                    timestamp: new Date().toISOString(),
                    currentURL: window.location.href,
                    message: '页面中没有检测到广告元素'
                };
                sendToSwift('adTypeDetector', noAdMessage);
            } else {
                const detailMessage = {
                    type: 'ad_detail',
                    totalElements: adDetectionResults.length,
                    adDetectionResults: adDetectionResults,
                    timestamp: new Date().toISOString(),
                    currentURL: window.location.href
                };
                sendToSwift('adTypeDetector', detailMessage);
            }
        } catch (error) {
            console.log(`❌ 发送结果到Swift端失败:`, error.message);
            try {
                const errorMessage = {
                    type: 'detection_error',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    currentURL: window.location.href
                };
                sendToSwift('adTypeDetector', errorMessage);
            } catch (sendError) {
                console.log('❌ 发送错误信息也失败了:', sendError.message);
            }
        }
        console.log('✅ 所有检测结果发送完成');
        processSecondLevelIframes();
        return adDetectionResults;
    } catch (error) {
        console.log('❌ getAdType 执行失败:', error.message);
        return null;
    }
}

function autoExecuteDetection() {
    if (document.readyState === 'complete') {
        setTimeout(getAdType, 1500);
        setTimeout(getAdType, 3000);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(getAdType, 1500);
            setTimeout(getAdType, 3000);
        });
        window.addEventListener('load', function() {
            setTimeout(getAdType, 2000);
            setTimeout(getAdType, 3000);
        });
    }
}

function processSecondLevelIframes() {
    try {
        console.log('🔍 开始处理第二层iframe的广告类型关联...');
        const firstLevelIframes = document.querySelectorAll('iframe');
        firstLevelIframes.forEach((firstIframe, firstIndex) => {
            try {
                const firstIframeKey = firstIframe.src || firstIframe.id;
                if (!firstIframeKey) return;
                const firstLevelAdInfo = window.iframeAdTypeMap.get(firstIframeKey);
                if (!firstLevelAdInfo) return;
                console.log(`🔍 处理第一层iframe: ${firstIframeKey}, 广告类型: ${firstLevelAdInfo.adType}`);
                try {
                    if (firstIframe.contentDocument) {
                        const secondLevelIframes = firstIframe.contentDocument.querySelectorAll('iframe');
                        secondLevelIframes.forEach((secondIframe, secondIndex) => {
                            try {
                                const secondIframeKey = secondIframe.src || secondIframe.id;
                                if (!secondIframeKey) return;
                                const isSecondLevelGoogleAd = secondIframe.src && secondIframe.src.includes('googleads.g.doubleclick.net');
                                const secondContainerId = secondIframe.getAttribute('data-google-container-id') || '';
                                const secondQueryId = secondIframe.getAttribute('data-google-query-id') || '';
                                const secondLevelMappingData = {
                                    adType: firstLevelAdInfo.adType,
                                    parentInsId: firstLevelAdInfo.parentInsId,
                                    parentInsAdType: firstLevelAdInfo.parentInsAdType,
                                    parentIframeKey: firstIframeKey,
                                    level: 2,
                                    source: firstLevelAdInfo.source || 'standard',
                                    isGoogleAdServer: isSecondLevelGoogleAd,
                                    containerId: secondContainerId,
                                    queryId: secondQueryId,
                                    timestamp: new Date().toISOString()
                                };
                                if (isSecondLevelGoogleAd && secondContainerId) {
                                    const secondGoogleKey = `google_second_${secondContainerId}_${secondQueryId}`;
                                    const secondSrcKey = secondIframe.src || '';
                                    const secondIdKey = secondIframe.id || '';
                                    window.iframeAdTypeMap.set(secondGoogleKey, secondLevelMappingData);
                                    if (secondSrcKey) window.iframeAdTypeMap.set(secondSrcKey, secondLevelMappingData);
                                    if (secondIdKey) window.iframeAdTypeMap.set(secondIdKey, secondLevelMappingData);
                                    console.log(`✅ 建立Google AdSense第二层iframe映射: ${secondGoogleKey} -> ${firstLevelAdInfo.adType}`);
                                } else {
                                    window.iframeAdTypeMap.set(secondIframeKey, secondLevelMappingData);
                                    console.log(`✅ 建立普通第二层iframe映射: ${secondIframeKey} -> ${firstLevelAdInfo.adType}`);
                                }
                                window.iframeHierarchyMap.set(secondIframeKey, {
                                    parent: firstIframeKey,
                                    grandParent: firstLevelAdInfo.parentInsId,
                                    adType: firstLevelAdInfo.adType,
                                    level: 2,
                                    source: firstLevelAdInfo.source || 'standard'
                                });
                                console.log(`✅ 建立第二层iframe映射关系: ${secondIframeKey} -> ${firstLevelAdInfo.adType} (继承自: ${firstIframeKey})`);
                            } catch (error) {
                                console.log(`❌ 处理第二层iframe ${secondIndex + 1} 失败:`, error.message);
                            }
                        });
                    }
                } catch (error) {
                    console.log(`⚠️ 无法访问第一层iframe ${firstIndex + 1} 内容:`, error.message);
                }
            } catch (error) {
                console.log(`❌ 处理第一层iframe ${firstIndex + 1} 失败:`, error.message);
            }
        });
        console.log('✅ 第二层iframe广告类型关联处理完成');
    } catch (error) {
        console.log('❌ 处理第二层iframe失败:', error.message);
    }
}

function getCurrentIframeAdType() {
    try {
        const currentIframeKey = window.location.href || (window.frameElement ? window.frameElement.id : '');
        if (!currentIframeKey) return null;
        let adInfo = window.iframeAdTypeMap.get(currentIframeKey);
        if (!adInfo) {
            if (window.frameElement && window.frameElement.id) {
                adInfo = window.iframeAdTypeMap.get(window.frameElement.id);
            }
        }
        if (!adInfo) {
            if (window.frameElement && window.frameElement.src) {
                adInfo = window.iframeAdTypeMap.get(window.frameElement.src);
            }
        }
        if (!adInfo) {
            if (window.frameElement) {
                const containerId = window.frameElement.getAttribute('data-google-container-id');
                const queryId = window.frameElement.getAttribute('data-google-query-id');
                if (containerId) {
                    const googleKey = `google_${containerId}_${queryId || ''}`;
                    adInfo = window.iframeAdTypeMap.get(googleKey);
                }
            }
        }
        if (adInfo) {
            console.log(`🎯 当前iframe ${currentIframeKey} 的广告类型: ${adInfo.adType}`);
            console.log(`📊 映射信息:`, adInfo);
            return adInfo;
        }
        const hierarchyInfo = window.iframeHierarchyMap.get(currentIframeKey);
        if (hierarchyInfo) {
            console.log(`🎯 通过层级关系找到iframe ${currentIframeKey} 的广告类型: ${hierarchyInfo.adType}`);
            return {
                adType: hierarchyInfo.adType,
                parentInsId: hierarchyInfo.grandParent,
                parentInsAdType: hierarchyInfo.adType,
                level: hierarchyInfo.level || 2,
                source: hierarchyInfo.source || 'standard'
            };
        }
        console.log(`⚠️ 未找到iframe ${currentIframeKey} 的广告类型信息`);
        console.log(`🔍 可用的映射键:`, Array.from(window.iframeAdTypeMap.keys()));
        return null;
    } catch (error) {
        console.log('❌ 获取当前iframe广告类型失败:', error.message);
        return null;
    }
}
window.PPP_GetAdTypeAndPostMessageScript = {
    getAdType: getAdType,
    autoExecuteDetection: autoExecuteDetection,
    getCurrentIframeAdType: getCurrentIframeAdType,
    iframeAdTypeMap: window.iframeAdTypeMap,
    iframeHierarchyMap: window.iframeHierarchyMap
};

function setupDynamicIframeObserver() {
    console.log('🔍 [AdTypeDetect] 设置动态iframe监听器');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'IFRAME') {
                        console.log('🆕 [AdTypeDetect] 检测到新添加的iframe:', node.src || node.id);
                        setTimeout(() => handleDynamicIframe(node), 100);
                    }
                    if (node.querySelectorAll) {
                        const iframes = node.querySelectorAll('iframe');
                        iframes.forEach(iframe => {
                            console.log('🆕 [AdTypeDetect] 检测到新节点内的iframe:', iframe.src || iframe.id);
                            setTimeout(() => handleDynamicIframe(iframe), 100);
                        });
                    }
                }
            });
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
    console.log('✅ [AdTypeDetect] 动态iframe监听器已启动');
}

function handleDynamicIframe(iframe) {
    console.log('🔄 [AdTypeDetect] 处理动态iframe:', {
        id: iframe.id,
        src: iframe.src,
        className: iframe.className
    });
    let parentIframe = iframe.parentElement;
    let adType = 'unknown';
    let parentInsId = '';
    let iframeLevel = 1;
    let foundInNested = false;
    let containerId = iframe.getAttribute('data-google-container-id') || '';
    while (parentIframe && parentIframe !== document.body) {
        if (parentIframe.tagName === 'IFRAME') {
            const parentAdType = parentIframe.getAttribute('data-ad-type');
            const parentInsIdAttr = parentIframe.getAttribute('data-parent-ins-id');
            const parentLevel = parentIframe.getAttribute('data-iframe-level');
            if (parentAdType && parentAdType !== 'unknown') {
                adType = parentAdType;
                parentInsId = parentInsIdAttr || '';
                iframeLevel = parseInt(parentLevel || '1') + 1;
                foundInNested = true;
                containerId = parentIframe.getAttribute('data-google-container-id') || '';
                console.log('🔗 [AdTypeDetect] 发现嵌套iframe，继承父级信息:', {
                    parentIframeId: parentIframe.id,
                    inheritedAdType: adType,
                    newLevel: iframeLevel
                });
                break;
            }
        }
        parentIframe = parentIframe.parentElement;
    }
    if (!foundInNested) {
        let adContainer = iframe.parentElement;
        while (adContainer && adContainer !== document.body) {
            if (adContainer.tagName === 'INS') {
                adType = getAdTypeFromInsElement(adContainer);
                parentInsId = adContainer.id || '';
                console.log('🎯 [AdTypeDetect] 为动态iframe找到ins容器:', {
                    adType,
                    parentInsId
                });
                break;
            }
            if (adContainer.tagName === 'DIV') {
                const divAdType = getAdTypeFromDivElement(adContainer);
                if (divAdType !== 'unknown') {
                    adType = divAdType;
                    parentInsId = adContainer.id || '';
                    console.log('🎯 [AdTypeDetect] 为动态iframe找到div容器:', {
                        adType,
                        parentInsId
                    });
                    break;
                }
            }
            adContainer = adContainer.parentElement;
        }
    }
    if (adType !== 'unknown') {
        const chainId = `${adType}-${foundInNested ? 'nested' : 'dynamic'}-level${iframeLevel}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        if (!iframe.id) {
            iframe.id = chainId;
        }
        iframe.setAttribute('data-ad-type', adType);
        iframe.setAttribute('data-parent-ins-id', parentInsId);
        iframe.setAttribute('data-iframe-level', iframeLevel.toString());
        iframe.setAttribute('data-chain-path', chainId);
        iframe.setAttribute('data-is-nested', foundInNested ? 'true' : 'false');
        const sendDynamicMessage = (attempt = 1) => {
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'AD_TYPE_INFO',
                        adType: adType,
                        containerId: containerId,
                        parentInsId: parentInsId,
                        iframeLevel: iframeLevel,
                        chainPath: chainId,
                        iframeId: iframe.id || '',
                        timestamp: new Date().toISOString(),
                        isDynamic: true,
                        isNested: foundInNested,
                        attempt: attempt
                    }, '*');
                    console.log(`📤 [AdTypeDetect] 向动态iframe发送广告类型(第${attempt}次):`, adType, `level-${iframeLevel}`);
                }
            } catch (error) {
                console.log(`❌ [AdTypeDetect] 向动态iframe发送消息失败(第${attempt}次):`, error.message);
            }
        };
        setTimeout(() => sendDynamicMessage(1), 100);
        setTimeout(() => sendDynamicMessage(2), 500);
        setTimeout(() => sendDynamicMessage(3), 1000);
        setTimeout(() => sendDynamicMessage(4), 2000);
        setTimeout(() => sendDynamicMessage(5), 3000);
        setTimeout(() => sendDynamicMessage(6), 5000);
        setupNestedIframeObserver(iframe);
    } else {
        console.log('⚠️ [AdTypeDetect] 动态iframe未找到广告类型:', iframe.src || iframe.id);
    }
}

function setupNestedIframeObserver(parentIframe) {
    try {
        if (!parentIframe.contentDocument) return;
        const nestedObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
                        console.log('🆕 [AdTypeDetect] 检测到嵌套iframe:', node.src || node.id);
                        setTimeout(() => handleDynamicIframe(node), 100);
                    }
                });
            });
        });
        nestedObserver.observe(parentIframe.contentDocument.body, {
            childList: true,
            subtree: true
        });
        console.log('✅ [AdTypeDetect] 为iframe设置嵌套观察器:', parentIframe.id);
    } catch (error) {
        console.log('⚠️ [AdTypeDetect] 无法为跨域iframe设置嵌套观察器:', error.message);
    }
}
try {
    autoExecuteDetection();
    if (window === window.top) {
        setupDynamicIframeObserver();
        console.log('🎯 [AdTypeDetect] 主页面启动动态iframe监听');
    }
} catch (error) {
    console.log('❌ 自动检测执行失败:', error.message);
}
