const exec = require('child_process').exec;
const prompt = require('electron-prompt');
const {
    Menu,
    MenuItem
} = remote;
let canvases = [];
let drawLine;
let deleteLine;
let deleteAllLines;
let elmsClicked = [];

$(document).ready(() => {
    drawLine = (thing1, thing2, index, cableModule, cableSource, cableSink, menu) => {
        let $t = $(thing1);
        let $i = $(thing2);
        // find offset positions for the word (t = this) and image (i)
        let ot = {
            x: $t.offset().left + $t.width() / 2 - 10,
            y: $t.offset().top + $t.height() / 2 - 10
        };
        let oi = {
            x: $i.offset().left + $i.width() / 2 - 10,
            y: $i.offset().top + $i.height() / 2 - 10
        };

        // x,y = top left corner
        // x1,y1 = bottom right corner
        let p = {
            x: ot.x < oi.x ? ot.x : oi.x,
            x1: ot.x > oi.x ? ot.x : oi.x,
            y: ot.y < oi.y ? ot.y : oi.y,
            y1: ot.y > oi.y ? ot.y : oi.y
        };

        // create canvas between those points
        let can = document.createElement('canvas')
        can.setAttribute('width', p.x1 - p.x + 10);
        can.setAttribute('height', p.y1 - p.y + 10);
        can.setAttribute('id', `${thing1}${thing2}`);
        can.setAttribute('data-cableid', index);
        can.setAttribute('data-cablemodule', cableModule);
        can.setAttribute('data-cablesource', cableSource);
        can.setAttribute('data-cablesink', cableSink);
        can.addEventListener('contextmenu', e => {
            e.preventDefault()
            menu.popup({
                window: remote.getCurrentWindow()
            })
        })

        canvases[`${thing1}${thing2}`] = can;

        let c = canvases[`${thing1}${thing2}`].getContext('2d');
        canvases[`${thing1}${thing2}`].style.position = 'absolute';
        canvases[`${thing1}${thing2}`].style.left = `${p.x}px`;
        canvases[`${thing1}${thing2}`].style.top = `${p.y}px`;
        canvases[`${thing1}${thing2}`].style.zIndex = -1;
        document.body.appendChild(canvases[`${thing1}${thing2}`])

        // draw line
        c.strokeStyle = '#888888';
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(ot.x - p.x + 10, ot.y - p.y + 10);
        c.lineTo(oi.x - p.x + 10, oi.y - p.y + 10);
        c.stroke();
        return canvases[`${thing1}${thing2}`];
    }
    deleteLine = (thing1, thing2) => {
        canvases[`${thing1}${thing2}`].remove();
        delete canvases[`${thing1}${thing2}`];
    }
    deleteAllLines = () => {
        let allCanvases = document.getElementsByTagName('canvas');
        for (let i = 0; i < allCanvases.length; i) {
            delete canvases[allCanvases[0].id]
            allCanvases[0].parentNode.removeChild(allCanvases[0])
        }
    }
    window.addEventListener('resize', function(e){
        e.preventDefault();
        deleteAllLines();
      })
    let sinksContainer = document.getElementById('sinks-container');
    let vSinksContainer = document.getElementById('v-sinks-container');
    let twoSinksContainer = document.getElementById('twosinks-container');

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.path[0].nodeName === 'HTML' || e.path[0].nodeName === '#document' || e.path[0].id.includes('sink-container')) {
            const menu = new Menu();
            menu.append(new MenuItem({
                label: 'New Virtual Sink',
                click() {
                    prompt({label: 'Name of the new Virtual Sink?'}).then(vSinkName => {
                        if (!vSinkName || vSinkName === '') {
                        }else {
                            exec('pacmd list-sources && pacmd list-sinks', (error, stdout, stderr) => {
                                let parsed = Parser(stdout)
                                if (parsed.filter(c => c['properties']['device.description'] === vSinkName)[0]) {
                                    alert('There is already a Virtual Sink with that name.');
                                }else {
                                    exec(`pacmd load-module module-null-sink sink_name=${vSinkName.replace(/ /g, '_')} sink_properties=device.description=${vSinkName.replace(/ /g, '_')}`);
                                }
                            })
                        }
                    });
                }
            }))
            menu.popup({
                window: remote.getCurrentWindow()
            })
        }
    }, false)

    setInterval(() => {
        exec('pacmd list-sources && pacmd list-sinks', (err, stdout, stderr) => {
            let parsed = Parser(stdout)
            parsed.forEach(t => {
                if (!document.getElementById(`sink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`) && t.driver !== '<module-null-sink.c>') {
                    let parentNode = document.createElement('div');
                    let textNode = document.createElement('p');
                    parentNode.id = `sink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`;
                    parentNode.setAttribute('data-sinkid', t.index);
                    parentNode.setAttribute('data-sinkmodule', t.module);
                    parentNode.setAttribute('data-sinkdisplayname', t['properties']['device.description']);
                    parentNode.setAttribute('data-sinkname', t['name'].split(' ')[1] ? t['name'].split(' ')[1].replace(/(<|>)/g, '') : t['name'].replace(/(<|>)/g, ''));
                    parentNode.classList.add('sink');
                    textNode.innerText = t['properties']['device.description'];
                    parentNode.appendChild(textNode);
                    sinksContainer.appendChild(parentNode);
                }
            });
            sinksContainer.childNodes.forEach(e => {
                if (!parsed.filter(c => `sink${c.name.replace(/(<|>)/g, '').replace(/\./g, '_')}` === e.getAttribute('id'))[0]) {
                    deleteAllLines()
                    sinksContainer.removeChild(e);
                }
            })
        });
    }, 500);
    setInterval(() => {
        exec('pacmd list-sources && pacmd list-sinks', (err, stdout, stderr) => {
            let parsed = Parser(stdout)
            parsed.forEach(t => {
                if (!document.getElementById(`vsink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`) && t.driver === '<module-null-sink.c>') {
                    let parentNode = document.createElement('div');
                    let textNode = document.createElement('p');
                    if (t.driver === '<module-null-sink.c>') {
                        parentNode.addEventListener('contextmenu', (e) => {
                            const menu = new Menu();
                            menu.append(new MenuItem({
                                label: 'Delete Virtual Sink',
                                click() {
                                    if(confirm(`Are you sure you want to delete the virtual sink: ${t['properties']['device.description']}?`)) {
                                        exec(`pacmd unload-module ${t.module}`);
                                    }
                                }
                            }))
                            menu.popup({
                                window: remote.getCurrentWindow()
                            })
                        });
                    }
                    parentNode.id = `vsink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`;
                    parentNode.setAttribute('data-sinkid', t.index);
                    parentNode.setAttribute('data-sinkmodule', t.module);
                    parentNode.setAttribute('data-sinkdisplayname', t['properties']['device.description']);
                    parentNode.setAttribute('data-sinkname', t['name'].split(' ')[1] ? t['name'].split(' ')[1].replace(/(<|>)/g, '') : t['name'].replace(/(<|>)/g, ''));
                    parentNode.classList.add('vsink');
                    textNode.innerText = t['properties']['device.description'];
                    parentNode.appendChild(textNode);
                    vSinksContainer.appendChild(parentNode);
                }
            });
            vSinksContainer.childNodes.forEach(e => {
                if (!parsed.filter(c => `vsink${c.name.replace(/(<|>)/g, '').replace(/\./g, '_')}` === e.getAttribute('id'))[0]) {
                    deleteAllLines()
                    vSinksContainer.removeChild(e);
                }
            })
        });
    }, 500);
    setInterval(() => {
        exec('pacmd list-sources && pacmd list-sinks', (err, stdout, stderr) => {
            let parsed = Parser(stdout)
            parsed.forEach(t => {
                if (!document.getElementById(`twosink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`) && !t['properties']['device.description'].toLowerCase().includes('monitor of ')) {
                    let parentNode = document.createElement('div');
                    let textNode = document.createElement('p');
                    if (t.driver === '<module-null-sink.c>') {
                        parentNode.addEventListener('contextmenu', (e) => {
                            const menu = new Menu();
                            menu.append(new MenuItem({
                                label: 'Delete Virtual Sink',
                                click() {
                                    if(confirm(`Are you sure you want to delete the virtual sink: ${t['properties']['device.description']}?`)) {
                                        exec(`pacmd unload-module ${t.module}`);
                                    }
                                }
                            }))
                            menu.popup({
                                window: remote.getCurrentWindow()
                            })
                        });
                    }
                    parentNode.id = `twosink${t.name.replace(/(<|>)/g, '').replace(/\./g, '_')}`;
                    parentNode.setAttribute('data-sinkid', t.index);
                    parentNode.setAttribute('data-sinkmodule', t.module);
                    parentNode.setAttribute('data-sinkdisplayname', t['properties']['device.description']);
                    parentNode.setAttribute('data-sinkname', t['name'].split(' ')[1] ? t['name'].split(' ')[1].replace(/(<|>)/g, '') : t['name'].replace(/(<|>)/g, ''));
                    parentNode.classList.add('twosink');
                    textNode.innerText = t['properties']['device.description'];
                    parentNode.appendChild(textNode);
                    twoSinksContainer.appendChild(parentNode);
                }
            });
            twoSinksContainer.childNodes.forEach(e => {
                if (!parsed.filter(c => `twosink${c.name.replace(/(<|>)/g, '').replace(/\./g, '_')}` === e.getAttribute('id'))[0]) {
                    deleteAllLines()
                    twoSinksContainer.removeChild(e);
                }
            })
        });
    }, 500);
    setInterval(() => {
        exec('pacmd list-sink-inputs', (error, stdout, stderr) => {
            let parsed = Parser(stdout).filter(d => d.driver === '<module-loopback.c>');
            parsed.forEach(e => {
                if (!document.getElementById(`#${document.querySelectorAll(`div[data-sinkdisplayname="${e['properties']['media.name'].replace(/Loopback (of|from) /g, '')}"]`)[0].id}#${document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[1].id}`)) {
                    const menu = new Menu();
                    menu.append(new MenuItem({
                        label: 'New Virtual Sink',
                        click() {
                            prompt({label: 'Name of the new Virtual Sink?'}).then(vSinkName => {
                                if (!vSinkName || vSinkName === '') {
                                }else {
                                    exec('pacmd list-sources && pacmd list-sinks', (error, stdout, stderr) => {
                                        let parsed = Parser(stdout)
                                        if (parsed.filter(c => c['properties']['device.description'] === vSinkName)[0]) {
                                            alert('There is already a Virtual Sink with that name.');
                                        }else {
                                            exec(`pacmd load-module module-null-sink sink_name=${vSinkName.replace(/ /g, '_')} sink_properties=device.description=${vSinkName.replace(/ /g, '_')}`);
                                        }
                                    })
                                }
                            });
                        }
                    }))
                    menu.append(new MenuItem({
                        label: 'Delete Virtual Cable',
                        click() {
                            if (confirm(`Are you sure you want to delete this virtual cable?`)) {
                                exec(`pacmd unload-module ${e.module}`);
                            }
                        }
                    }))
                    drawLine(`#${document.querySelectorAll(`div[data-sinkdisplayname="${e['properties']['media.name'].replace(/Loopback (of|from) /g, '')}"]`)[0].id}`, `#${document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[0].classList.contains('vsink') ? document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[0].id : document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[0].classList.contains('sink') ? document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[1].id : document.querySelectorAll(`div[data-sinkname="${e['sink'].split(' ')[1].replace(/(<|>)/g, '')}"]`)[0].id}`, e.index, e.module, e['properties']['media.name'].replace(/Loopback (of|from) /g, ''), e['sink'].split(' ')[1].replace(/(<|>)/g, ''), menu)
                }
            })
            document.body.childNodes.forEach(e => {
                if (e.nodeName === 'CANVAS' && !parsed.filter(d => e.getAttribute('data-cablesink') === d.sink.split(' ')[1].replace(/(<|>)/g, '') && e.getAttribute('data-cablesource') === d['properties']['media.name'].replace(/Loopback (of|from) /g, ''))[0]) {
                    e.parentNode.removeChild(e);
                }
            })
        })
    }, 500)
});



