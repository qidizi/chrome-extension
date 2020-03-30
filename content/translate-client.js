/*
 * 注入式的翻译功能
 * 本js会被注入到每一个tab页面中;
 */
+function () {
    // 防止重复注入
    if (window.qi_di_zi_translate_client)
        return;

    window.qi_di_zi_translate_client = 1;
    var _ = {
        isTop: window.top === window.self,
    };
    createPanel();

    function postText(text) {
        //请求翻译选中文字
        if (!text || /^[\s\d~`\!@#$%\^&\*\(\)_\-\+\=\{\[\}\]\|\\\:;\'"<,>\.\?\/]*$/.test(text)) {
            // 纯数字符号类不需要翻译
            return;
        }

        top.postMessage({
            transText: text
        }, "*");
    }

    function bindEvents() {
        //因为insert js与tab网页的window不是同一对象,就像运行于不同的sanbox中,所以,只能使用pm来通知
        _.isTop && window.addEventListener("message", function (event) {
            if (event.data.mouse_up) {
                // 来自点击
                let iframe = document.getElementById('qidizi_translate');
                let iframe_outside_x = window.innerWidth - iframe.offsetWidth;
                let iframe_outside_y = window.innerHeight - iframe.offsetHeight;

                if (event.data.x < iframe_outside_x || event.data.y < iframe_outside_y) {
                    // 在iframe框外点击，才隐藏iframe
                    panelSwitch(0);
                }
            }

            if (event.data.transText) {
                //新翻译文字请求
                getTrans(event.data.transText);
            }
        }, false);
        //绑定up事件
        document.addEventListener('mouseup', function (ev) {
            // 移动结束了再判断是否需要翻译,只有按住了ctrl才开始
            top.postMessage({
                mouse_up: true,
                x: ev.clientX,
                y: ev.clientY
            }, "*");
            _.selectionState /*&& ev.ctrlKey*/ && getText();
            _.selectionState = 0;
        }, false);
        //绑定选择文字的事件
        document.addEventListener('mousedown', function (ev) {
            _.selectionState = 0;
        }, false);
        //绑定选择文字的事件
        document.addEventListener('selectionchange', function (ev) {
            _.selectionState++;
        }, false);
    }

    function panelSwitch(show) {
        //隐/显面板
        if (show) {
            _.shower.style.display = 'block';
            // 让输入框获得焦点，以便在失去焦点时隐藏
            // _.focuser.focus();
        } else {
            _.shower.style.display = 'none';
        }
    }

    function getText(text) {
        //获取选中文件,如果有,就请求翻译
        text = window.getSelection().toString().replace(/^\s+|\s+$/g, '').replace(/[_,]/g, ' ');
        postText(text);
    }

    function getTrans(text) {
        //必应的词典:并不提供api,只能使用html来自己提取
        document
            .getElementById('qidizi_translate')
            .src = 'https://cn.bing.com/dict/search?q=' + encodeURIComponent(text);
        panelSwitch(1);
    }

    function createPanel() {
        // 在top框架插入翻译面板
        bindEvents();

        // 只在top 框架创建显示层
        if (!_.isTop) {
            return;
        }

        _.shower = document.createElement('DIV');
        (document.body || document.documentElement).appendChild(_.shower);
        _.shower.innerHTML = `
<style>
#qidizi_translate {
position: fixed;
display: block;
width: 400px;
height: 300px;
border: 1px dotted darkgray;
margin: 0;
padding:0;
background-color: white;
bottom: 0;
right: 0;
opacity: 0.9;
z-index: 9999999999;
box-sizing: border-box;
}
</style>
<iframe src="about:blank" id="qidizi_translate" name="qidizi_translate"></iframe>
`;
        panelSwitch(0);
    }
}();
