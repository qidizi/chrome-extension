// 实现接口，兼容chrome与firefox
if (!window.docker)
    window.docker = class {
        static storage_keys = {
            translate_on: 'translate_on'
        };
        static browser = window['chrome'] || window['browser'];
        static  is_chrome = !!window['chrome'];
        static is_firefox = !!window['browser'];

        static storage_local_set(obj, cb) {
            // if ('Object' !== this.type_of(obj)){
            //     return false;
            // }
            //

            return this.browser.storage.local.set(obj, cb);
        }

        static storage_local_get(obj, cb) {
            // if ('Object' !== this.type_of(obj)){
            //     return false;
            // }
            //

            return this.browser.storage.local.get(obj, cb);
        }

        static type_of(obj) {
            return Object.prototype.toString.call(obj).replace(/^\[object\s|\]$/ig, '');
        }
    };

