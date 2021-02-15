const ENUM_FUNC_NAMES = [
    "FuncNone",
    "FuncConst",
    "FuncRamp",
    "FuncTri",
    "FuncPulse",
    "FuncStep"
]

const ENUM_MODES_NAMES = [
    "MODES_CLEAR",
    "MODES_PLAIN",
    "MODES_SQUARE",
    "MODES_SICKLE",
    "MODES_FAN",
    "MODES_BOXES",
    "MODES_SICKLE_ADV",
    "MODES_FAN_ADV",
    "MODES_MAP_ES",
    "MODES_MAP_ES_ZH",
    "MODES_CMAP_DNA",
    "MODES_CMAP_FIRE",
    "MODES_CMAP_BENSON",
    "MODES_CMAP_YEN",
    "MODES_CMAP_LOVE",
    "MODES_CMAP_GEAR"
]
function createEnum(name_list) {
    enum_dict = {};
    id = 0
    name_list.forEach((e) => {
        enum_dict[e] = id;
        id += 1
    })
    return enum_dict
}
ENUM_FUNC = createEnum(ENUM_FUNC_NAMES);

var socket = io.connect();
var region_id = 0;
var selected_row = -1;
var wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: 'mediumspringgreen',
    progressColor: 'lightskyblue',
    plugins: [
        WaveSurfer.regions.create(),
        WaveSurfer.timeline.create({
            container: '#wave-timeline'
        }),
        WaveSurfer.cursor.create({
            showTime: true,
            opacity: 1,
            customShowTimeStyle: {
                'background-color': '#000',
                color: '#fff',
                padding: '2px',
                'font-size': '10px'
            }

        })
    ]
});

var EFFECT_LIST = [] //save all scheduled effect
var deleted_effect = 0
//object for saving all parameters
class PARA {
    /*constructor(func, range, lower, p1, p2) {
        this.func = func
        this.range = range
        this.lower = lower
        this.p1 = p1
        this.p2 = p2
    }*/
}
class HSV {
    /*constructor(PARA_H, PARA_S, PARA_V) {
        this.H = PARA_H
        this.S = PARA_S
        this.V = PARA_V
    }*/
    H = new PARA()
    S = new PARA()
    V = new PARA()
}
class Effect {
    constructor(id, start_time, duration) {
        this.id = id
        //this.mode = mode
        this.start_time = start_time
        this.duration = duration
        this.deleted = false
        /*this.para['p1'] = p1
        this.para['p2'] = p2
        this.para['p3'] = p3
        this.para['p4'] = p4*/
    }
    X = new HSV()
    Y = new HSV()
    para = {}

    createModeSelect() {
        var th = $("<th></th>")
        var content = `ID : <span style="color:red;">` + this.id + `</span><br> 模式`
        var table = $(`<table class="table-set"</table>`)
        var tr = $(`<tr>`).append($(`<td class="td"></td>`))
            .append($(`<td class="td">`)
                .append($(`<select id="select_effect" onchange="mode_onchange(` + this.id + `)">`)
                    .append(`<option selected disabled hidden>請選擇效果:</option>`)))
        table.append(tr)
        var i
        for (i = 1; i <= 4; i++) {
            var tr2 = $(`<tr>`)
                .append($(`<td id="p` + i + `" class="td">P` + i + `</td>`))
                .append($(`<td class="td"><input type="number" id="In_P` + i + `" onchange="para_change('p` + i + `-` + this.id + `', '` + `In_P` + i + `')"></td>`))
            table.append(tr2)
        }
        th.append(content)
            .append(table)
        $('#SelectionTable').append(th)
        effect_append()
    }
    createXYSelect(xy) {
        var th = $("<th></th>")
        var content = xy.toUpperCase() + `方向顏色`
        var table = $(`<table class="table-set"</table>`)
        var tr = $(`<tr>`).append($(`<td class="td"></td>`))
            .append($(`<td class="td">變化模式</td>`))
            .append($(`<td class="td">參數</td>`))
        table.append(tr)
        var hsv = ['H', 'S', 'V']
        hsv.forEach(e => {
            var tr2 = $(`<tr>`).append($(`<td class="td">` + e + `</td>`))
                .append($(`<td class="td"></td>`)
                    .append($(`<select class="function` + xy + `" id="` + xy + `_` + e + `_func" onchange="func_change('` + xy + e.toLowerCase() + `-func-` + this.id + `', '` + xy + `_` + e + `_func')"></select>`)
                        .append($(`<option selected disabled hidden>請選擇模式:</option>`))))
                .append($(`<td class="td"></td>`)
                    .append($(`<input type="number" id="` + xy + e.toLowerCase() + `-r" placeholder="range" onchange="hsv_para_change('` + xy + e.toLowerCase() + `-r-` + this.id + `','` + xy + e.toLowerCase() + `-r')">`))
                    .append($(`<input type="number" id="` + xy + e.toLowerCase() + `-l" placeholder="lower" onchange="hsv_para_change('` + xy + e.toLowerCase() + `-l-` + this.id + `','` + xy + e.toLowerCase() + `-l')"><br>`))
                    .append($(`<input type="number" id="` + xy + e.toLowerCase() + `-1" placeholder="1" onchange="hsv_para_change('` + xy + e.toLowerCase() + `-1-` + this.id + `','` + xy + e.toLowerCase() + `-1')">`))
                    .append($(`<input type="number" id="` + xy + e.toLowerCase() + `-2" placeholder="2" onchange="hsv_para_change('` + xy + e.toLowerCase() + `-2-` + this.id + `','` + xy + e.toLowerCase() + `-2')">`)))
            table.append(tr2)
        })
        th.append(content)
            .append(table)
        $('#SelectionTable').append(th)
        function_append(xy)
    }
}

$(document).ready(function () {
    socket.emit('connection', (data) => { })
    //console.log(wavesurfer.getPlaybackRate())
    $("#speed").val(wavesurfer.getPlaybackRate().toString())
    wavesurfer.zoom(Number($("#zoom").val()));

    music_select_append()
    $("#select_music").change(() => {
        var src = "../music/" + $('#select_music :selected').text();
        wavesurfer.load(src);
        wavesurfer.clearRegions();
        EFFECT_LIST = []
        $("[id*='tr-']").remove()
        region_id = 0;
        $('#music-now-playing').text("目前撥放音樂：" + $('#select_music :selected').text())
    });
    /*EFFECT_LIST[0].createModeSelect()
    EFFECT_LIST[0].createXYSelect("x")
    EFFECT_LIST[0].createXYSelect("y")*/
    /*effect_append()
    function_append()
    clear_hide()*/
})

$(document).on("click", "#table_effect tr", (e) => {
    //$(this).find("td").css("background", "red")
    //console.log((e.target.parentElement.id).substring(3))
    selected_row = (e.target.parentElement.id).substring(3)
    //$('#effect_selected').text(selected_row)
    /*if (selected_row.length == 0) enable_hide()
    else clear_hide()*/
    clear_selection_table()
    if (selected_row != "") {
        EFFECT_LIST[selected_row].createModeSelect()
        EFFECT_LIST[selected_row].createXYSelect("x")
        EFFECT_LIST[selected_row].createXYSelect("y")
        load_table_data(selected_row)
    }

});
/*$('#table_effect').on('click', '.td', (e) => {
    console.log(e.target.id)
})*/

//wavesurfer.load('../music/Ashes Remain - On My Own.mp3');
wavesurfer.on('audioprocess', () => {
    $("#time").val(wavesurfer.getCurrentTime().toFixed(3).toString())
})
wavesurfer.on('seek', () => {
    $("#time").val(wavesurfer.getCurrentTime().toFixed(3).toString())
})

$("#play_pause").click(() => {
    wavesurfer.playPause()
})
$("#forward").click(() => {
    wavesurfer.seekTo((wavesurfer.getCurrentTime() - $("#shift_step").val() / 1000) / wavesurfer.getDuration())
    $("#time").val(wavesurfer.getCurrentTime().toFixed(3).toString())
})
$("#backward").click(() => {
    wavesurfer.seekTo((wavesurfer.getCurrentTime() + $("#shift_step").val() / 1000) / wavesurfer.getDuration())
    $("#time").val(wavesurfer.getCurrentTime().toFixed(3).toString())
})

/*$("#speed_down").click(() => {
    wavesurfer.setPlaybackRate(wavesurfer.getPlaybackRate() - 0.05)
    $("#speed").val(wavesurfer.getPlaybackRate().toFixed(3).toString())
})
$("#speed_up").click(() => {
    wavesurfer.setPlaybackRate(wavesurfer.getPlaybackRate() + 0.05)
    $("#speed").val(wavesurfer.getPlaybackRate().toFixed(3).toString())
})*/
$("#speed").on("input change", () => {
    wavesurfer.setPlaybackRate($("#speed").val())
})

$('#time').change(() => {
    wavesurfer.seekTo($('#time').val() / wavesurfer.getDuration())
})

$("#add").click(() => {
    var start_time = wavesurfer.getCurrentTime().toFixed(3)
    var end_time = (wavesurfer.getCurrentTime() + 3.0).toFixed(3)
    //console.log("start time : " + start_time.toString() + " end time : " + end_time.toString())
    wavesurfer.addRegion({
        id: region_id,
        start: start_time,
        end: end_time,
        loop: false,
        color: 'hsla(200, 100%, 30%, 0.1)'
    })
    //console.log(wavesurfer.regions.list)
    var region = wavesurfer.regions.list[region_id]
    if (!region.hasDeleteButton) create_delete_button(region);

    create_effect(region_id, start_time, end_time)
    let temp = new Effect(region_id, Number(start_time * 1000), Number((end_time - start_time) * 1000))
    EFFECT_LIST.push(temp)
    /*clear_selection_table()
    EFFECT_LIST[region_id].createModeSelect()
    EFFECT_LIST[region_id].createXYSelect("x")
    EFFECT_LIST[region_id].createXYSelect("y")*/
    region_id++
})

$("#zoom").on("input change", () => {
    //console.log(Number($("#zoom").val()))
    wavesurfer.zoom(Number($("#zoom").val()));
    $('#zoom-value').text($("#zoom").val())
})
$("#volume").on("input change", () => {
    wavesurfer.setVolume(Number($("#volume").val()) / 100);
})

wavesurfer.on('region-dblclick', (region) => {
    console.log(region.start)
})

wavesurfer.on('region-update-end', (region) => {
    $("#effect-start-" + region.id.toString()).html(region.start.toFixed(3) * 1000)
    $("#effect-duration-" + region.id.toString()).html((region.end - region.start).toFixed(3) * 1000)
    EFFECT_LIST[region.id].start_time = Number(region.start.toFixed(3) * 1000)
    EFFECT_LIST[region.id].duration = Number((region.end - region.start).toFixed(3) * 1000)

    /*if (!region.hasDeleteButton) {
        var regionEl = region.element;

        var deleteButton = regionEl.appendChild(document.createElement('deleteButton'));
        deleteButton.className = 'fa fa-trash';

        deleteButton.addEventListener('click', function (e) {
            EFFECT_LIST[region.id].deleted = true
            //EFFECT_LIST.splice(region.id, region.id + 1);
            $("#tr-" + region.id).remove()
            region.remove();
            deleted_effect++
        });

        deleteButton.title = "Delete region";

        var css = {
            display: 'block',
            float: 'right',
            padding: '3px',
            position: 'relative',
            zIndex: 10,
            cursor: 'pointer',
            cursor: 'hand',
            color: '#129fdd'
        };

        region.style(deleteButton, css);
        region.hasDeleteButton = true;
    }*/
})

function create_delete_button(region) {
    var regionEl = region.element;

    var deleteButton = regionEl.appendChild(document.createElement('deleteButton'));
    deleteButton.className = 'fa fa-trash';

    deleteButton.addEventListener('click', function (e) {
        EFFECT_LIST[region.id].deleted = true
        //EFFECT_LIST.splice(region.id, region.id + 1);
        $("#tr-" + region.id).remove()
        region.remove();
        deleted_effect++
    });

    deleteButton.title = "Delete region";

    var css = {
        display: 'block',
        float: 'right',
        padding: '3px',
        position: 'relative',
        zIndex: 10,
        cursor: 'pointer',
        cursor: 'hand',
        color: '#129fdd'
    };

    region.style(deleteButton, css);
    region.hasDeleteButton = true;
}

function effect_append() {
    var $effect = $('#select_effect')
    ENUM_MODES_NAMES.forEach(element => {
        $effect.append($('<option>', {
            text: element,
            value: element
        }))
    })
}
function function_append(xy) {
    $('.function' + xy).each((i, obj) => {
        ENUM_FUNC_NAMES.forEach(element => {
            $('#' + obj.id).append($('<option>', {
                text: element,
                value: element
            }))
        })
    })
}
function clear_selection_table() {
    $("#SelectionTable th").remove()
}
function load_table_data(id) {
    hsv_para = ['range', 'lower', '1', '2']
    $('#select_effect').val(EFFECT_LIST[id].mode)
    $('#In_P1').val(EFFECT_LIST[id].para['p1'])
    $('#In_P2').val(EFFECT_LIST[id].para['p2'])
    $('#In_P3').val(EFFECT_LIST[id].para['p3'])
    $('#In_P4').val(EFFECT_LIST[id].para['p4'])
    $('#x_H_func').val(EFFECT_LIST[id].X.H.func)
    $('#xh-r').val(EFFECT_LIST[id].X.H.range)
    $('#xh-l').val(EFFECT_LIST[id].X.H.lower)
    $('#xh-1').val(EFFECT_LIST[id].X.H.p1)
    $('#xh-2').val(EFFECT_LIST[id].X.H.p2)
    $('#x_S_func').val(EFFECT_LIST[id].X.S.func)
    $('#xs-r').val(EFFECT_LIST[id].X.S.range)
    $('#xs-l').val(EFFECT_LIST[id].X.S.lower)
    $('#xs-1').val(EFFECT_LIST[id].X.S.p1)
    $('#xs-2').val(EFFECT_LIST[id].X.S.p2)
    $('#x_V_func').val(EFFECT_LIST[id].X.V.func)
    $('#xv-r').val(EFFECT_LIST[id].X.V.range)
    $('#xv-l').val(EFFECT_LIST[id].X.V.lower)
    $('#xv-1').val(EFFECT_LIST[id].X.V.p1)
    $('#xv-2').val(EFFECT_LIST[id].X.V.p2)
    $('#y_H_func').val(EFFECT_LIST[id].Y.H.func)
    $('#yh-r').val(EFFECT_LIST[id].Y.H.range)
    $('#yh-l').val(EFFECT_LIST[id].Y.H.lower)
    $('#yh-1').val(EFFECT_LIST[id].Y.H.p1)
    $('#yh-2').val(EFFECT_LIST[id].Y.H.p2)
    $('#y_S_func').val(EFFECT_LIST[id].Y.S.func)
    $('#ys-r').val(EFFECT_LIST[id].Y.S.range)
    $('#ys-l').val(EFFECT_LIST[id].Y.S.lower)
    $('#ys-1').val(EFFECT_LIST[id].Y.S.p1)
    $('#ys-2').val(EFFECT_LIST[id].Y.S.p2)
    $('#y_V_func').val(EFFECT_LIST[id].Y.V.func)
    $('#yv-r').val(EFFECT_LIST[id].Y.V.range)
    $('#yv-l').val(EFFECT_LIST[id].Y.V.lower)
    $('#yv-1').val(EFFECT_LIST[id].Y.V.p1)
    $('#yv-2').val(EFFECT_LIST[id].Y.V.p2)

}
function clear_hide() {
    hsv = ['h', 's', 'v']
    XY = ['x', 'y']
    $('#select_effect').removeAttr("disabled")
    $('#x_H_func').removeAttr("disabled")
    $('#x_S_func').removeAttr("disabled")
    $('#x_V_func').removeAttr("disabled")
    $('#y_H_func').removeAttr("disabled")
    $('#y_S_func').removeAttr("disabled")
    $('#y_V_func').removeAttr("disabled")
    for (i = 1; i <= 4; i++) {
        $("#In_P" + i).removeAttr("readonly")
    }
    XY.forEach(ele => {
        hsv.forEach(e => {
            $('#' + ele + e + '-r').removeAttr("readonly")
            $('#' + ele + e + '-l').removeAttr("readonly")
            $('#' + ele + e + '-1').removeAttr("readonly")
            $('#' + ele + e + '-2').removeAttr("readonly")
        })
    })
}
function enable_hide() {
    hsv = ['h', 's', 'v']
    XY = ['x', 'y']
    $('#select_effect').prop("disabled", true)
    $('#x_H_func').prop("disabled", true)
    $('#x_S_func').prop("disabled", true)
    $('#x_V_func').prop("disabled", true)
    $('#y_H_func').prop("disabled", true)
    $('#y_S_func').prop("disabled", true)
    $('#y_V_func').prop("disabled", true)
    for (i = 1; i <= 4; i++) {
        $("#In_P" + i).prop("readonly", true)
    }
    XY.forEach(ele => {
        hsv.forEach(e => {
            $('#' + ele + e + '-r').prop("readonly", true)
            $('#' + ele + e + '-l').prop("readonly", true)
            $('#' + ele + e + '-1').prop("readonly", true)
            $('#' + ele + e + '-2').prop("readonly", true)
        })
    })
}

function mode_onchange(id) {
    var select = $("#select_effect :selected").text()
    $("#effect-mode-" + id).html(select.substring(6))
    EFFECT_LIST[id].mode = select
}
function para_change(table_id, input_id) {
    var val = $("#" + input_id).val()
    $("#" + table_id).html(val)
    var id = table_id.substring(3)
    var parameter = table_id.substring(0, 2)
    EFFECT_LIST[id].para[parameter] = Number(val)
}
function func_change(table_id, input_id) {
    var select = $("#" + input_id + " :selected").text()
    $("#" + table_id).html(select.substring(4))
    var id = table_id.substring(8)
    var xy = table_id.substring(0, 1)
    var hsv = table_id.substring(1, 2)
    var temp
    if (xy == 'x') temp = EFFECT_LIST[id].X
    else if (xy == 'y') temp = EFFECT_LIST[id].Y
    if (hsv == 'h') temp = temp.H
    else if (hsv == 's') temp = temp.S
    else if (hsv == 'v') temp = temp.V
    temp.func = ENUM_FUNC[select]
}
function hsv_para_change(table_id, input_id) {
    var val = $("#" + input_id).val()
    $("#" + table_id).html(val)
    var id = table_id.substring(5)
    var xy = table_id.substring(0, 1)
    var hsv = table_id.substring(1, 2)
    var parameter = table_id.substring(3, 4)
    var temp
    if (xy == 'x') temp = EFFECT_LIST[id].X
    else if (xy == 'y') temp = EFFECT_LIST[id].Y
    if (hsv == 'h') temp = temp.H
    else if (hsv == 's') temp = temp.S
    else if (hsv == 'v') temp = temp.V
    if (parameter == "r") temp.range = Number(val)
    else if (parameter == "l") temp.lower = Number(val)
    else if (parameter == "1") temp.p1 = Number(val)
    else if (parameter == "2") temp.p2 = Number(val)
}

function create_effect(id, start, end) {
    var $myTable = $('#table_effect');

    var rowElements = function (row) {
        var n = id.toString();
        var $row = $('<tr class="tr" id="tr-' + n + '"></tr>');
        var ID = '<td class="td" id="effect-' + n + '"></td>'
        var $col_1 = $(ID).html(n);
        var $col_2 = $('<td class="td" id="effect-mode-' + n + '"></td>')
        var time = '<td class="td" id="effect-start-' + n + '"></td>'
        var $col_3 = $(time).html(start * 1000)
        var $col_4 = $('<td class="td" id="effect-duration-' + n + '"></td>').html((end - start).toFixed(3) * 1000)
        var $col_5 = $('<td class="td" id="xh-func-' + n + '"></td>')
        var $col_6 = $('<td class="td" id="xh-r-' + n + '"></td>')
        var $col_7 = $('<td class="td" id="xh-l-' + n + '"></td>')
        var $col_8 = $('<td class="td" id="xh-1-' + n + '"></td>')
        var $col_9 = $('<td class="td" id="xh-2-' + n + '"></td>')
        var $col_10 = $('<td class="td" id="xs-func-' + n + '"></td>')
        var $col_11 = $('<td class="td" id="xs-r-' + n + '"></td>')
        var $col_12 = $('<td class="td" id="xs-l-' + n + '"></td>')
        var $col_13 = $('<td class="td" id="xs-1-' + n + '"></td>')
        var $col_14 = $('<td class="td" id="xs-2-' + n + '"></td>')
        var $col_15 = $('<td class="td" id="xv-func-' + n + '"></td>')
        var $col_16 = $('<td class="td" id="xv-r-' + n + '"></td>')
        var $col_17 = $('<td class="td" id="xv-l-' + n + '"></td>')
        var $col_18 = $('<td class="td" id="xv-1-' + n + '"></td>')
        var $col_19 = $('<td class="td" id="xv-2-' + n + '"></td>')
        var $col_20 = $('<td class="td" id="yh-func-' + n + '"></td>')
        var $col_21 = $('<td class="td" id="yh-r-' + n + '"></td>')
        var $col_22 = $('<td class="td" id="yh-l-' + n + '"></td>')
        var $col_23 = $('<td class="td" id="yh-1-' + n + '"></td>')
        var $col_24 = $('<td class="td" id="yh-2-' + n + '"></td>')
        var $col_25 = $('<td class="td" id="ys-func-' + n + '"></td>')
        var $col_26 = $('<td class="td" id="ys-r-' + n + '"></td>')
        var $col_27 = $('<td class="td" id="ys-l-' + n + '"></td>')
        var $col_28 = $('<td class="td" id="ys-1-' + n + '"></td>')
        var $col_29 = $('<td class="td" id="ys-2-' + n + '"></td>')
        var $col_30 = $('<td class="td" id="yv-func-' + n + '"></td>')
        var $col_31 = $('<td class="td" id="yv-r-' + n + '"></td>')
        var $col_32 = $('<td class="td" id="yv-l-' + n + '"></td>')
        var $col_33 = $('<td class="td" id="yv-1-' + n + '"></td>')
        var $col_34 = $('<td class="td" id="yv-2-' + n + '"></td>')
        var $col_35 = $('<td class="td" id="p1-' + n + '"></td>')
        var $col_36 = $('<td class="td" id="p2-' + n + '"></td>')
        var $col_37 = $('<td class="td" id="p3-' + n + '"></td>')
        var $col_38 = $('<td class="td" id="p4-' + n + '"></td>')

        // Add the columns to the row
        $row.append($col_1, $col_2, $col_3, $col_4, $col_5, $col_6, $col_7, $col_8, $col_9, $col_10);
        $row.append($col_11, $col_12, $col_13, $col_14, $col_15, $col_16, $col_17, $col_18, $col_19, $col_20);
        $row.append($col_21, $col_22, $col_23, $col_24, $col_25, $col_26, $col_27, $col_28, $col_29, $col_30);
        $row.append($col_31, $col_32, $col_33, $col_34, $col_35, $col_36, $col_37, $col_38);

        // Add to the newly-generated array
        return $row;
    };

    $myTable.append(rowElements);

}

function music_select_append() {
    var $music_selection = $('#select_music');
    $.get("/get_music_list").success(function (data) {
        data.forEach(element => {
            $music_selection.append($('<option>', {
                text: element
            }));
        });
    });
}

$("#save_json").click(() => {
    //downloadFile(JSON.stringify(EFFECT_LIST))
    socket.emit('save_json', JSON.stringify(EFFECT_LIST))
})
$("#download_json").click(() => {
    downloadFile(JSON.stringify(EFFECT_LIST))
    //socket.emit('save_json', JSON.stringify(EFFECT_LIST))
})

function downloadFile(data) {
    //藉型別陣列建構的 blob 來建立 URL
    let fileName = "UserEffect.json";
    let blob = new Blob([data], {
        type: "text/plain",
    });
    var href = URL.createObjectURL(blob);
    // 從 Blob 取出資料
    var link = document.createElement("a");
    document.body.appendChild(link);
    link.href = href;
    link.download = fileName;
    link.click();
}
/*// Equalizer
wavesurfer.on('ready', function () {
    let EQ = [
        {
            f: 32,
            type: 'lowshelf'
        },
        {
            f: 64,
            type: 'peaking'
        },
        {
            f: 125,
            type: 'peaking'
        },
        {
            f: 250,
            type: 'peaking'
        },
        {
            f: 500,
            type: 'peaking'
        },
        {
            f: 1000,
            type: 'peaking'
        },
        {
            f: 2000,
            type: 'peaking'
        },
        {
            f: 4000,
            type: 'peaking'
        },
        {
            f: 8000,
            type: 'peaking'
        },
        {
            f: 16000,
            type: 'highshelf'
        }
    ];

    // Create filters
    let filters = EQ.map(function (band) {
        let filter = wavesurfer.backend.ac.createBiquadFilter();
        filter.type = band.type;
        filter.gain.value = 0;
        filter.Q.value = 1;
        filter.frequency.value = band.f;
        return filter;
    });

    // Connect filters to wavesurfer
    wavesurfer.backend.setFilters(filters);

    // Bind filters to vertical range sliders
    let container = document.querySelector('#equalizer');
    filters.forEach(function (filter) {
        let input = document.createElement('input');
        Object.assign(input, {
            type: 'range',
            min: -40,
            max: 40,
            value: 0,
            title: filter.frequency.value,
            id: 'eq' + filter.frequency.value
        });
        input.style.display = 'inline-block';
        input.setAttribute('orient', 'vertical');
        input.className = "equalizer"
        wavesurfer.util.style(input, {
            webkitAppearance: 'slider-vertical',
            width: '50px',
            height: '150px'
        });
        container.appendChild(input);

        let onChange = function (e) {
            filter.gain.value = ~~e.target.value;
        };

        input.addEventListener('input', onChange);
        input.addEventListener('change', onChange);
    });

    // For debugging
    wavesurfer.filters = filters;
});
$("#eq-reset").click(() => {
    var x = document.getElementsByClassName("equalizer");
    var i;
    for (i = 0; i < x.length; i++) {
        x[i].value = 0
    }
})*/