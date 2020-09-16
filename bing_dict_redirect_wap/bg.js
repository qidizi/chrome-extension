chrome.webRequest.onBeforeRequest.addListener(
    function (requestDetails) {
        // 如果是http协议的bing,禁止请求
        console.log(requestDetails.url)
        if (/^http:\/+.*bing.com\//i.test(requestDetails.url)) {
            return {cancel: true};
        }
    },
    {urls: ['<all_urls>']},
    ["blocking"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {

        if (/^\w+:\/+([\w-]*\.)+qmth\.com\.cn(:\d+)?\//.test(details.url)) {
            // 启明考试网址
            let user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) electron-exam-shell/1.9.0 Chrome/58.0.3029.110 Electron/1.7.16 Safari/537.36';

            for (var i = 0; i < details.requestHeaders.length; ++i) {
                // 修改bing的词典请求为手机头
                if (details.requestHeaders[i].name === 'User-Agent') {
                    details.requestHeaders[i].value = user_agent;
                    break;
                }
            }

            return {requestHeaders: details.requestHeaders};
        }

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