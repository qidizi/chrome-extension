chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        if (details.url.indexOf('https://cn.bing.com/dict/search') < 0) {
            return {requestHeaders: details.requestHeaders};
        }

        for (var i = 0; i < details.requestHeaders.length; ++i) {
            // 修改bing的词典请求为手机头
            if (details.requestHeaders[i].name === 'User-Agent') {
                details.requestHeaders[i].value = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)" +
                    " AppleWebKit/605.1.15 (KHTML, like Gecko)" +
                    " Version/13.0.3 Mobile/15E148 Safari/604.1";
                break;
            }
        }

        return {requestHeaders: details.requestHeaders};
    },
    {urls: ['<all_urls>']},
    ['blocking', 'requestHeaders', 'extraHeaders']
);