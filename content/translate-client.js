/*
 * 注入式的翻译功能
 * 本js会被注入到每一个tab页面中;
 */
+function () {
    // 防止重复注入
    if (window.qi_di_zi_translate_client)
        return;
    console.log('翻译插件加载中...');

    window.qi_di_zi_translate_client = 1;
    var _ = {
        panel_class: 'chromeQidiziTranslatePanel',
        index: 0,
        port: docker.browser.runtime.connect(null, {name: 'translate-client'}),
        isTop: window.top === window.self,
        protocol: /^http/i.test(location.protocol) ? location.protocol : 'http:'
    };
    createPanel();

    function postText(text) {
        //请求翻译选中文字

        if (!text || /^[\s\d~`\!@#$%\^&\*\(\)_\-\+\=\{\[\}\]\|\\\:;\'"<,>\.\?\/]*$/.test(text)) {
            // 纯数字符号类不需要翻译
            return;
        }

        if (text.length >= 300) {
            // 字数过多也不翻译
            return;
        }

        top.postMessage({
            transText: text
        }, "*");
    }

    function bindEvents() {
        //因为insert js与tab网页的window不是同一对象,就像运行于不同的sanbox中,所以,只能使用pm来通知
        _.isTop && window.addEventListener("message", function (event) {
            if (event.data.transText) {
                //新翻译文字请求
                getTrans(event.data.transText);
            }
        }, false);
        // _.isTop && window.addEventListener('blur', function () {
        //     //窗口失去焦点,隐藏show
        //     _.showerShow && panelSwitch(0);
        // });
        document.addEventListener('click', function (e) {
            // 点击就关闭浮动层，除非点击区域处于浮动层内
            var el = e.srcElement;
            var inner = 0;

            do {
                if (_.panel_class === el.id) {
                    inner = 1;
                    break;
                }

                el = el.parentElement;
            } while (el && el.tagName);

            //console.log('document', inner);

            !inner && _.showerShow && panelSwitch(0);
        });

        _.isTop && document.addEventListener('click', function (ev) {
            //点击执行某个方法
            var el = ev.srcElement;
            var func = el.getAttribute('data-func');

            if ('a' != el.tagName.toLowerCase() || !func) {
                return;
            }

            if ('function' == typeof _[func]) {
                _[func].apply(el);
            }

            // 阻止点击事件继续向上通知
            ev.stopPropagation();
            // 停止默认事件
            ev.preventDefault();
            return false;
        });
        //绑定up事件
        document.addEventListener('mouseup', function (ev) {
            //点击非show区域,隐藏show
            _.isTop && !inPanel(ev.srcElement) && _.showerShow && panelSwitch(0);
            // 移动结束了再判断是否需要翻译,只有按住了ctrl才开始
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

    function html2text(html) {
        return html.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function inPanel(dom) {
        //是否panel中dom
        var loop = 10; //自己的box的标签层级
        while (--loop > 0 && _.shower !== dom && dom && dom.parentElement) {
            dom = dom.parentElement;
        }

        return _.shower === dom;
    }

    function addResultHeader(name) {
        // 增加翻译切换tab

        // 是中文,无法用于class
        var className = "jsResultHeader_" + escape(name).replace(/%/g, '');

        if (document.getElementsByClassName(className).length) {
            return true;
        }

        var a = document.createElement('A');
        a.href = "javascript:void(0);";
        a.className = className;
        a.innerHTML = name;
        a.title = name;
        a.setAttribute('data-func', 'showResult');
        a.setAttribute('data-name', name);
        _.jsResultHeader.appendChild(a);

        if (!_.resultHeaderDoms) {
            _.resultHeaderDoms = [];
        }

        _.resultHeaderDoms.push(a);
        return true;
    }

    function addClass(dom, cls) {
        // 简单实现加dom class
        var domClass = dom.className || '';
        var clsCP = cls;
        cls = '\\s+' + cls.replace(/\s+/g, '\\s+|\\s+') + '\\s+';
        domClass = (' ' + domClass + ' ').replace(new RegExp(cls, 'gi'), ' ');
        domClass += ' ' + clsCP;
        domClass = domClass.replace(/^\s+|\s+$/g, '').replace(/\s{2,}/g, ' ');
        dom.className = domClass;
        return domClass;
    }

    function removeClass(dom, cls) {
        // 简单实现删除dom class
        var domClass = dom.className || '';
        cls = '\\s+' + cls.replace(/\s+/g, '\\s+|\\s+') + '\\s+';
        domClass = (' ' + domClass + ' ').replace(new RegExp(cls, 'gi'), ' ').replace(/^\s+|\s+$/g, '').replace(/\s{2,}/g, ' ');
        dom.className = domClass;
        return domClass;
    }

    _.showResult = function (name) {
        // 切换另一个翻译引擎的翻译结果

        if (/a/i.test(this.tagName)) {
            // 点击a
            name = this.getAttribute('data-name');
        }

        for (var i = 0; i < _.resultHeaderDoms.length; i++) {
            var a = _.resultHeaderDoms[i];

            if (a.title == name) {
                addClass(a, 'focus');
            } else {
                removeClass(a, 'focus');
            }
        }

        _.jsResultBody.innerHTML = _.results[name];
        // 设置面板状态为显示
        panelSwitch(1);
        return false;
    };

    function cacheResult(html, name) {
        // 缓存翻译结果

        if ('' === html) {
            return;
        }

        if (!_.results) {
            _.results = {};
        }

        _.results[name] = html;
        addResultHeader(name);

        if (_.resultDefult == name) {
            // 如果是默认显示的引擎就立刻显示
            _.showResult(name);
        }
    }

    _.hide_panel = function () {
        panelSwitch(0);
    };

    function panelSwitch(show) {
        //隐/显面板
        if (show) {
            _.shower.style.display = 'block';
            _.showerShow = 1;
            // 让输入框获得焦点，以便在失去焦点时隐藏
            // _.focuser.focus();
        } else {
            _.shower.style.display = 'none';
            _.showerShow = 0;
        }
    }

    function getText(text) {
        //获取选中文件,如果有,就请求翻译
        text = window.getSelection().toString().replace(/^\s+|\s+$/g, '').replace(/[_,]/g, ' ');
        postText(text);
    }

    function getTrans(text) {
        //选中相同的字,重复的翻译,不需要再请求,除非上轮发生请求错误
        // if (_.previousText == text && !_.requestError) {
        //     panelSwitch(1);
        //     _.playVoice();
        //     return;
        // }

        _.previousText = text;
        _.requestError = 0;
        translateByBing(text);
        translateByYouDao(text);
        // translateByBaiDu(text);
    }

    _.playVoice = function (src) {
        //播放声音:防止重复加载相同音源

        if (!_.audio) {
            _.audio = new Audio();
            _.audio.autoplay = true;
            _.audio.style.display = 'none';
            _.audio.controls = true;
            _.shower.appendChild(_.audio);
        }

        function replay() {
            _.audio.pause();
            _.audio.currentTime = 0;
            _.audio.play();
        }

        function playSrc(src) {
            _.audio.pause();
            _.audio.src = src;
            _.audio.load();
            _.audio.play();
        }

        if (!src) {
            src = this.href;

            if (!src) {
                return false;
            }
        }

        var currentSrc = _.audio.currentSrc;

        if (src) {
            if (src == currentSrc) { //新音源与播放器中相同
                replay();
                return false;
            }

            playSrc(src);
            return false;
        }

        if (currentSrc == _.defaultVoiceSrc) { // 播放器就是默认的
            replay();
            return false;
        }

        playSrc(_.defaultVoiceSrc);
        return false;
    };


    function translateByBaiDu(txt) {
        //百度的翻译结果
        var appid = '20170413000044756';
        var salt = +new Date;
        var key = '5CfEje5ivzcP15JlY3UL';
        var sign = md5(appid + txt + salt + key);
        var to = /\w/.test(txt) ? 'zh' : 'en';
        txt = encodeURIComponent(txt);
        var src = 'https://fanyi-api.baidu.com/api/trans/vip/translate?from=auto&to=' + to + '&appid=' + appid + '&salt=' + salt + '&q=' + txt + '&sign=' + sign;
        xhr(src, function (obj) {
            let txt = obj.text;
            try {
                var obj = new Function('', 'return ' + txt)();
            } catch (e) {
                return cacheResult('获取百度翻译结果失败', '百度');
            }

            if (obj.error_msg) {
                _.requestError = 1;
                return cacheResult('获取百度翻译出错:' + obj.error_msg, '百度');
            }


            var dst = obj.trans_result[0].dst;
            var html = dst;
            cacheResult(html, '百度');
        }, '百度');
    }

    function translateByYouDao(txt) {
        //有道的翻译结果
        // 默认显示有道的结果
        _.resultDefult = '有道';
        txt = encodeURIComponent(txt);
        var src = _.protocol + '//fanyi.youdao.com/openapi.do?keyfrom=chrome-plugin&key=985650714&type=data&doctype=json&version=1.1&q=' + txt + '&_=' + +new Date;
        xhr(src, function (obj) {
            var txt = obj.text;
            try {
                var obj = new Function('', 'return ' + txt)();
            } catch (e) {
                return cacheResult('获取有道翻译结果失败', '有道');
            }

            if (obj.errorCode) {
                var error = {
                    20: '要翻译的文本过长',
                    30: '无法进行有效的翻译',
                    40: '不支持的语言类型',
                    50: '开发的API的key已经失效,请重新申请',
                    60: '无词典结果，仅在获取词典结果生效'
                };
                _.requestError = 1;
                return cacheResult('获取有道翻译出错:' + error[obj.errorCode], '有道');
            }

            var html = '<a href="http://dict.youdao.com/search?q=' + encodeURIComponent(obj.query) + '" target="_youdao" title="点击查看更多">' + html2text(obj.query) + '</a>';
            var voiceSrc = '';

            if (obj.basic) {

                if (obj.basic['phonetic']) { //默认发音:应该是英式
                    _.defaultVoiceSrc = voiceSrc = 'http://dict.youdao.com/dictvoice?type=1&audio=' + encodeURIComponent(obj.query);
                    html += ' UK[<a href="' + voiceSrc + '"  data-func="playVoice" title="点击这里播放发音">' + obj.basic['phonetic'] + '</a>]';
                }

                if (obj.basic['us-phonetic']) { //us发音
                    html += ' US[<a  data-func="playVoice" href="http://dict.youdao.com/dictvoice?type=2&audio=' + encodeURIComponent(obj.query) + '" title="点击这里播放发音">' + obj.basic['us-phonetic'] + '</a>] ';
                }
            }


            // 最准确的一个中文翻译
            if (obj.translation) {
                html += '<br>' + obj.translation;
            }

            if (obj.basic) {

                if (obj.basic.explains && obj.basic.explains.length) { //更加展开中文解释
                    html += '<br>' + obj.basic.explains.join('<br>') +
                        '<br>';
                }
            }

            if (obj.web && obj.web.length) {
                html += '<br>';

                for (var i = 0; i < obj.web.length; i++) {
                    var list = obj.web[i];

                    if (!list.key) {
                        continue;
                    }

                    html += list.key + ':<br>' +
                        list.value.join(';&nbsp;') +
                        '<br><br>';
                }
            }

            cacheResult(html, '有道');
        }, '有道');
    }

    function translateByBing(text) {
        //必应的词典:并不提供api,只能使用html来自己提取
        xhr(_.protocol + '//cn.bing.com/dict/search?q=' + encodeURIComponent(text), function (obj) {
            var data = obj.text;
            var hrefBase = 'http://cn.bing.com/';
            var voiceSrc = '';
            var html = '<a href="http://cn.bing.com/dict/search?q=' + encodeURIComponent(text) + '" target="_bing" title="点击查看必应网页结果">' + text + '</a><br>';
            // 从bing的翻译结果html中解析出结果;如果发生了变化,需要修改正则
            var ma = data.match(/<div\s+class[\s\="']+hd_area['"][^>]*>[\s\S]+?<div\s+class[\s\="']+df_div["'][^>]*>/i);

            if (!ma) {
                return cacheResult(html + '无翻译结果', '必应');
            }

            // 有翻译结果,如果变化了,需要修改上面的
            ma = ma[0];
            // 删除搭配/近义词
            ma = ma.replace(/<div\s+class[\s\="']+wd_div["'][^>]*>[\s\S]*$/i, '');
            var htmlEnd = '';
            // 删除复数,现在分词,过去式等结果
            ma = ma.replace(/<div\s+class[\s\="']+hd_div1["'][^>]*>[\s\S]*$/i, function ($0) {
                htmlEnd = stripHtml($0, hrefBase) + '<br>' + htmlEnd;
                return '';
            });
            // 删除v,n,网络等等结果
            ma = ma.replace(/<ul[^>]*>[\s\S]*$/i, function ($0) {
                // 加上换行
                $0 = $0.replace(/<\/li[^>]*>/ig, '<br>');
                // 加上空白
                $0 = $0.replace(/<span\s+class[\s\="']+def["'][^>]*>/ig, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
                htmlEnd = stripHtml($0, hrefBase) + '<br>' + htmlEnd;
                return '';
            });
            // 给发音加上点击播放翻译读音
            var br = '<br>';
            ma.replace(/<div\s+class[\s\="']+hd_pr\w*["'][^>]*>([^<]+?)<\/div>[\s\S]+?(http[^>'"\=]+\.mp3)[^>]+>/ig, function ($0, $1, $2) {
                voiceSrc = $2;
                htmlEnd = '<a title="点击播放语音" data-func="playVoice" href="' + $2 + '">' + $1 + '</a> &nbsp;&nbsp;' + br + htmlEnd;
                br = '';
            });
            cacheResult(html + htmlEnd, '必应');
            voiceSrc && _.playVoice(voiceSrc);
        }, '必应');
    }

    function xhr(url, cb) {
        _.port.postMessage({to: 'translate-bg', url: url, index: ++_.index});
        _['xhr_cb_' + _.index] = cb;
    }

    function stripHtml(str, hrefBase) {
        // 去掉多余的html,只保留a标签
        var br = 0;
        !hrefBase && (hrefBase = '');
        str = str.replace(/<\/?([a-z]+)[^>]*>/gi, function ($0, $1) {
            if ('|br|a|'.indexOf('|' + $1.toLowerCase() + '|') > -1) {
                $0 = $0.replace(/\starget[\s\="']+[^"']+["']/i, '').replace(/\shref[\s\="']+(\/[^"']*)["']/i, '  target="_blank" href="' + hrefBase + '$1"');
                return $0;
            }

            if ($0.toLowerCase().indexOf('</div') > -1) {
                if (!br) {
                    br++;
                    return '\n';
                }
            } else {
                br = 0;
            }

            return '';
        });
        return str;
    }

    function createPanel() {
        // 在top框架插入翻译面板
        bindEvents();
        _.port['onMessage'].addListener(function (msg) {
            _['xhr_cb_' + msg.index](msg);
            delete _['xhr_cb_' + msg.index];
        });

        if (!_.isTop) {
            return;
        }

        _.shower = document.createElement('DIV');
        _.shower.className = _.panel_class;
        _.shower.id = _.panel_class;
        _.shower.title = '点击框外关闭';
        (document.body || document.documentElement).appendChild(_.shower);
        _.shower.innerHTML = '<style> \
.chromeQidiziTranslatePanel{ \
position:fixed; \
left:0; \
bottom:30px; \
z-index:999999999999999; \
max-height:100%; \
max-width:100%; \
font-size:12px; \
overflow:auto; \
white-space:nowrap; \
display:none; \
} \
.chromeQidiziTranslatePanel *{font-size:12px!important;color:black!important;} \
.chromeQidiziTranslatePanel .showBox{border:2px dotted lightgray;} \
.chromeQidiziTranslatePanel a{color:blue!important;text-decoration:none;} \
.chromeQidiziTranslatePanel a:hover{color:black!important;text-decoration:underline;} \
.chromeQidiziTranslatePanel fieldset{background-color:white;} \
.chromeQidiziTranslatePanel legend{text-align:right;background-color:white;width:auto!important;border-bottom:0 none!important;margin-bottom:0px!important;} \
.chromeQidiziTranslatePanel .query{display:block;line-height:12px;font-size:11px;color:blue;width:90%;margin:0 auto;border:0 none;border-bottom: 1px black solid;text-align:center;background-color:transparent;border-radius:3px;} \
.chromeQidiziTranslatePanel .jsResultHeader a{margin: 0px 3px!important;} \
.chromeQidiziTranslatePanel .jsResultHeader a.focus{padding: 3px!important;border-bottom: 2px solid!important;} \
.chromeQidiziTranslatePanel legend a.close{font-size:20px!important;font-weight: bold;color: red!important;}\
</style> \
<fieldset class="showBox"> \
<legend>\
<a href="javascript:void(0);" class="close" data-func="hide_panel">关闭</a>\
</legend> \
<div class="showContent"> \
<input class="query jsInputer" placeholder="输入单词回车翻译" />\
</div> \
</fieldset> \
<fieldset class="showBox"> \
<legend class="jsResultHeader">\
</legend> \
<div class="showContent jsResultBody"> \
</div> \
</fieldset> \
';
        _.jsResultHeader = _.shower.getElementsByClassName('jsResultHeader')[0];
        _.jsResultBody = _.shower.getElementsByClassName('jsResultBody')[0];
        _.focuser = _.query = _.shower.getElementsByTagName('INPUT')[0];
        _.query.onkeyup = function (e) {
            // 回车触发输入翻译
            if (13 !== e.keyCode) {
                return;
            }

            postText(this.value);
        }
    }

    // md5
    !function (n) {
        "use strict";

        function t(n, t) {
            var r = (65535 & n) + (65535 & t), e = (n >> 16) + (t >> 16) + (r >> 16);
            return e << 16 | 65535 & r
        }

        function r(n, t) {
            return n << t | n >>> 32 - t
        }

        function e(n, e, o, u, c, f) {
            return t(r(t(t(e, n), t(u, f)), c), o)
        }

        function o(n, t, r, o, u, c, f) {
            return e(t & r | ~t & o, n, t, u, c, f)
        }

        function u(n, t, r, o, u, c, f) {
            return e(t & o | r & ~o, n, t, u, c, f)
        }

        function c(n, t, r, o, u, c, f) {
            return e(t ^ r ^ o, n, t, u, c, f)
        }

        function f(n, t, r, o, u, c, f) {
            return e(r ^ (t | ~o), n, t, u, c, f)
        }

        function i(n, r) {
            n[r >> 5] |= 128 << r % 32, n[(r + 64 >>> 9 << 4) + 14] = r;
            var e, i, a, h, d, l = 1732584193, g = -271733879, v = -1732584194, m = 271733878;
            for (e = 0; e < n.length; e += 16) i = l, a = g, h = v, d = m, l = o(l, g, v, m, n[e], 7, -680876936), m = o(m, l, g, v, n[e + 1], 12, -389564586), v = o(v, m, l, g, n[e + 2], 17, 606105819), g = o(g, v, m, l, n[e + 3], 22, -1044525330), l = o(l, g, v, m, n[e + 4], 7, -176418897), m = o(m, l, g, v, n[e + 5], 12, 1200080426), v = o(v, m, l, g, n[e + 6], 17, -1473231341), g = o(g, v, m, l, n[e + 7], 22, -45705983), l = o(l, g, v, m, n[e + 8], 7, 1770035416), m = o(m, l, g, v, n[e + 9], 12, -1958414417), v = o(v, m, l, g, n[e + 10], 17, -42063), g = o(g, v, m, l, n[e + 11], 22, -1990404162), l = o(l, g, v, m, n[e + 12], 7, 1804603682), m = o(m, l, g, v, n[e + 13], 12, -40341101), v = o(v, m, l, g, n[e + 14], 17, -1502002290), g = o(g, v, m, l, n[e + 15], 22, 1236535329), l = u(l, g, v, m, n[e + 1], 5, -165796510), m = u(m, l, g, v, n[e + 6], 9, -1069501632), v = u(v, m, l, g, n[e + 11], 14, 643717713), g = u(g, v, m, l, n[e], 20, -373897302), l = u(l, g, v, m, n[e + 5], 5, -701558691), m = u(m, l, g, v, n[e + 10], 9, 38016083), v = u(v, m, l, g, n[e + 15], 14, -660478335), g = u(g, v, m, l, n[e + 4], 20, -405537848), l = u(l, g, v, m, n[e + 9], 5, 568446438), m = u(m, l, g, v, n[e + 14], 9, -1019803690), v = u(v, m, l, g, n[e + 3], 14, -187363961), g = u(g, v, m, l, n[e + 8], 20, 1163531501), l = u(l, g, v, m, n[e + 13], 5, -1444681467), m = u(m, l, g, v, n[e + 2], 9, -51403784), v = u(v, m, l, g, n[e + 7], 14, 1735328473), g = u(g, v, m, l, n[e + 12], 20, -1926607734), l = c(l, g, v, m, n[e + 5], 4, -378558), m = c(m, l, g, v, n[e + 8], 11, -2022574463), v = c(v, m, l, g, n[e + 11], 16, 1839030562), g = c(g, v, m, l, n[e + 14], 23, -35309556), l = c(l, g, v, m, n[e + 1], 4, -1530992060), m = c(m, l, g, v, n[e + 4], 11, 1272893353), v = c(v, m, l, g, n[e + 7], 16, -155497632), g = c(g, v, m, l, n[e + 10], 23, -1094730640), l = c(l, g, v, m, n[e + 13], 4, 681279174), m = c(m, l, g, v, n[e], 11, -358537222), v = c(v, m, l, g, n[e + 3], 16, -722521979), g = c(g, v, m, l, n[e + 6], 23, 76029189), l = c(l, g, v, m, n[e + 9], 4, -640364487), m = c(m, l, g, v, n[e + 12], 11, -421815835), v = c(v, m, l, g, n[e + 15], 16, 530742520), g = c(g, v, m, l, n[e + 2], 23, -995338651), l = f(l, g, v, m, n[e], 6, -198630844), m = f(m, l, g, v, n[e + 7], 10, 1126891415), v = f(v, m, l, g, n[e + 14], 15, -1416354905), g = f(g, v, m, l, n[e + 5], 21, -57434055), l = f(l, g, v, m, n[e + 12], 6, 1700485571), m = f(m, l, g, v, n[e + 3], 10, -1894986606), v = f(v, m, l, g, n[e + 10], 15, -1051523), g = f(g, v, m, l, n[e + 1], 21, -2054922799), l = f(l, g, v, m, n[e + 8], 6, 1873313359), m = f(m, l, g, v, n[e + 15], 10, -30611744), v = f(v, m, l, g, n[e + 6], 15, -1560198380), g = f(g, v, m, l, n[e + 13], 21, 1309151649), l = f(l, g, v, m, n[e + 4], 6, -145523070), m = f(m, l, g, v, n[e + 11], 10, -1120210379), v = f(v, m, l, g, n[e + 2], 15, 718787259), g = f(g, v, m, l, n[e + 9], 21, -343485551), l = t(l, i), g = t(g, a), v = t(v, h), m = t(m, d);
            return [l, g, v, m]
        }

        function a(n) {
            var t, r = "", e = 32 * n.length;
            for (t = 0; t < e; t += 8) r += String.fromCharCode(n[t >> 5] >>> t % 32 & 255);
            return r
        }

        function h(n) {
            var t, r = [];
            for (r[(n.length >> 2) - 1] = void 0, t = 0; t < r.length; t += 1) r[t] = 0;
            var e = 8 * n.length;
            for (t = 0; t < e; t += 8) r[t >> 5] |= (255 & n.charCodeAt(t / 8)) << t % 32;
            return r
        }

        function d(n) {
            return a(i(h(n), 8 * n.length))
        }

        function l(n, t) {
            var r, e, o = h(n), u = [], c = [];
            for (u[15] = c[15] = void 0, o.length > 16 && (o = i(o, 8 * n.length)), r = 0; r < 16; r += 1) u[r] = 909522486 ^ o[r], c[r] = 1549556828 ^ o[r];
            return e = i(u.concat(h(t)), 512 + 8 * t.length), a(i(c.concat(e), 640))
        }

        function g(n) {
            var t, r, e = "0123456789abcdef", o = "";
            for (r = 0; r < n.length; r += 1) t = n.charCodeAt(r), o += e.charAt(t >>> 4 & 15) + e.charAt(15 & t);
            return o
        }

        function v(n) {
            return unescape(encodeURIComponent(n))
        }

        function m(n) {
            return d(v(n))
        }

        function p(n) {
            return g(m(n))
        }

        function s(n, t) {
            return l(v(n), v(t))
        }

        function C(n, t) {
            return g(s(n, t))
        }

        function A(n, t, r) {
            return t ? r ? s(t, n) : C(t, n) : r ? m(n) : p(n)
        }

        "function" == typeof define && define.amd ? define(function () {
            return A
        }) : "object" == typeof module && module.exports ? module.exports = A : n.md5 = A
    }(this);
}
();
