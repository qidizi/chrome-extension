function saveOptions(e) {
    docker.storage_local_set({
        translate_on: +document.querySelector("#" + docker.storage_keys.translate_on).checked
    });
    e.preventDefault();
}

function restoreOptions() {
    docker.storage_local_get(docker.storage_keys.translate_on, (res) => {
        document.querySelector("#"+docker.storage_keys.translate_on).checked = !!res.translate_on;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);