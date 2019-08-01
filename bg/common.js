function xhr(url, callBack) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) { // 4 = "loaded"
            if (xmlhttp.status === 200) { // 200 = OK
                try {
                    callBack({text: xmlhttp.responseText, success: 1});
                } catch (e) {
                    callBack({success: 0, text: '翻译插件通过xhr获取数据出错：' + e + '; url: ' + url});
                }
            } else {
                callBack({success: 0, text: '翻译插件通过xhr获取数据出错:' + url});
            }
        }
    };
    var async = true; //异步
    var method = "get";
    xmlhttp.open(method, url, async);
    var postData = null;
    xmlhttp.send(postData);
}

function do_translate(port, msg) {
    // 只有收到翻译请求，才处理
    if (!msg || 'translate-bg' !== msg.to) return;
    xhr(msg.url, function (obj) {
        obj.index = msg.index;
        port.postMessage(obj);
    })
}

docker.browser.runtime.onConnect.addListener((port) => {
    // 注意这个会被每个frame触发，如一个tab有多个frame，但是当前传递反选字符肯定只有一个
    port.onMessage.addListener(function (msg) {
        do_translate(port, msg);
    });
});