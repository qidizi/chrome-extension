+function () {
return;
    if (window.q_m_k_s)
        return;
    window.q_m_k_s = true;
    window.nodeRequire = function (id) {
        return {
            existsSync(name) {
                if (name === "multiCamera.exe") return false;
            }
        }
    };

    alert('eee')
    console.log('qidizi');
}();
