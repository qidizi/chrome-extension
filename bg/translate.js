// 翻译功能后台js
docker.browser.tabs.onUpdated.addListener(function (tid, change, ext) {
    // 加载中/完成状态，才注入
    //console.log(change.status, tid, ext.url)
    if ('.loading.complete.'.indexOf("." + change.status + '.') > -1)
        return;

    docker.storage_local_get(docker.storage_keys.translate_on, (res) => {
        // 未启用
        if (!res.translate_on) return;
        docker.browser.tabs.get(tid, function () {
            if (docker.browser.runtime.lastError) {
                // 这个错误只有在callback中有
                console.log('tab异常，终止注入翻译功能：' + docker.browser.runtime.lastError.message);
                return;
            }

            // 可能会出现 操作已经关闭的tab，触发
            // Unchecked runtime.lastError: No tab with id: 1.
            docker.browser.tabs.executeScript(tid, {
                file: '/docker.js',
                allFrames: true,
                runAt: 'document_start' // 页面加载dom阶段插入
            });

            docker.browser.tabs.executeScript(tid, {
                file: '/content/translate-client.js',
                allFrames: true,
                runAt: 'document_start'
            });
        });
    });
});
