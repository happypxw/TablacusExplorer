const Addon_Id = "tabplus";
const item = await GetAddonElement(Addon_Id);
if (!item.getAttribute("Set")) {
	item.setAttribute("Icon", 1);
	item.setAttribute("Drive", 1);
	item.setAttribute("New", 1);
}
if (window.Addon == 1) {
	Addons.TabPlus = {
		Click: [],
		Button: [],
		Drag: [],
		Drop: [],
		pt: await api.Memory("POINT"),
		nCount: [],
		nIndex: [],
		bFlag: [],
		nFocused: -1,
		opt: {},
		str: {},
		tids: [],
		tidResize: null,
		nSelected: [],

		Arrange: async function (Id) {
			delete Addons.TabPlus.tids[Id];
			const o = document.getElementById("tabplus_" + Id);
			if (o) {
				const TC = await te.Ctrl(CTRL_TC, Id);
				if (TC && await TC.Visible) {
					const nCount = await TC.Count;
					Addons.TabPlus.tids[Id] = null;
					Addons.TabPlus.nIndex[Id] = await TC.SelectedIndex;
					Addons.TabPlus.nCount[Id] = nCount;
					if (o.lastChild && Addons.TabPlus.opt.New) {
						o.removeChild(o.lastChild);
					}
					let nDisp = o.getElementsByTagName("li").length;
					while (nDisp > nCount) {
						o.removeChild(o.lastChild);
						--nDisp;
					}
					while (nDisp < nCount) {
						let s = ['<li id="tabplus_', Id, '_', nDisp, '"'];
						if (Addons.TabPlus.opt.DragFolder || ui_.IEVer < 10) {
							s.push(' onmousemove="Addons.TabPlus.Move(event, this)"');
						} else {
							s.push(' draggable = "true" ondragstart = "return Addons.TabPlus.Start5(event, this)" ondragend = "Addons.TabPlus.End5(event)"');
						}
						if (Addons.TabPlus.opt.Align > 1 && Addons.TabPlus.opt.Width) {
							s.push(' style="width: 100%"');
						}
						s.push('></li>');
						o.insertAdjacentHTML("beforeend", s.join(""));
						++nDisp;
					}
					if (Addons.TabPlus.opt.New) {
						let s = ['<li class="tab3" onclick="Addons.TabPlus.New(', Id, ');return false" title="', Addons.TabPlus.str.NewTab, '"'];
						if (Addons.TabPlus.opt.Align > 1 && Addons.TabPlus.opt.Width) {
							s.push(' style="text-align: center; width: 100%"');
						}
						s.push('>+</li>');
						o.insertAdjacentHTML("beforeend", s.join(""));
					}
					Addons.TabPlus.SetActiveColor(Id);
					const bRedraw = await api.GetKeyState(VK_LBUTTON) >= 0;
					for (let i = 0; i < nCount; ++i) {
						Addons.TabPlus.Style(TC, i, bRedraw);
					}
					Common.TabPlus.rc[Id] = await GetRect(o);
				}
			}
		},

		SelectionChanged: async function (TC, Id) {
			if (await TC.Type == CTRL_TC && await TC.Visible && !Addons.TabPlus.tids[Id]) {
				Addons.TabPlus.tids[Id] = setTimeout(function () {
					Addons.TabPlus.Arrange(Id);
				}, 99);
			}
		},

		SetActiveColor: async function (Id) {
			const TC = await te.Ctrl(CTRL_TC);
			if (!TC || Id != await TC.Id) {
				return;
			}
			Addons.TabPlus.SetActiveColor2(Addons.TabPlus.nFocused, "");
			if (Addons.TabPlus.opt.Active) {
				Addons.TabPlus.SetActiveColor2(Id, "activecaption");
				Addons.TabPlus.nFocused = Id;
			}
		},

		SetActiveColor2: function (Id, s) {
			(document.getElementById("Panel_" + Id) || {}).className = s;
		},

		New: async function (Id) {
			const TC = await te.Ctrl(CTRL_TC, Id);
			if (TC) {
				const FV = await TC.Selected;
				await CreateTab(FV);
				TC.Move(await TC.SelectedIndex, await TC.Count - 1);
			}
		},

		Style: async function (TC, i, bRedraw) {
			let r = await Promise.all([TC[i], TC.Id]);
			const FV = r[0];
			const Id = r[1];
			const o = document.getElementById("tabplus_" + Id + "_" + i);
			if (FV && o && await FV.FolderItem) {
				const promise = [FV.FolderItem.Path, RunEvent4("GetTabColor", FV), FV.Data.Lock, FV.Data.Protect, CanClose(FV), GetTabName(FV)]
				if (Addons.TabPlus.opt.Icon) {
					promise.push(GetIconImage(FV, Addons.TabPlus.opt.clBtnFace));
				}
				r = await Promise.all(promise);
				const evTop = document.getElementById("tabplus_" + Id);
				const nOldHeight = evTop.offsetHeight;
				const path = r[0];
				if (Addons.TabPlus.opt.Tooltips) {
					o.title = path;
				}
				const cl = r[1];
				const s = ['<table><tr style="width: 100%'];
				if (/^#/.test(cl)) {
					let c = Number(cl.replace(/^#/, "0x"));
					c = (c & 0xff0000) * .0045623779296875 + (c & 0xff00) * 2.29296875 + (c & 0xff) * 114;
					s.push(';color:', c > 127000 ? "#000" : "#fff");
				}
				s.push('">');
				const bLock = r[2];
				const bProtect = r[3];
				const r0 = Addons.TabPlus.opt.IconSize;
				let w = (Addons.TabPlus.opt.Close || bLock || bProtect) ? -r0 : 0;
				if (!Addons.TabPlus.opt.NoLock && bLock) {
					s.push('<td class="lockcell" style="padding-right: 2px; vertical-align: middle; width: ', r0, 'px">', Addons.TabPlus.ImgLock2, '</td>');
					w -= 2;
				} else if (Addons.TabPlus.opt.Protected && bProtect) {
					s.push('<td class="protectcell" style="padding-right: 2px; vertical-align: middle; width: ', r0, 'px">', Addons.TabPlus.ImgProtect, '</td>');
					w -= 2;
				}
				if (r[6]) {
					s.push('<td class="iconcell" style="padding-right: 3px; vertical-align: middle; width:', 20 * screen.deviceYDPI / 96, 'px">');
					if (Addons.TabPlus.opt.Drive) {
						const res = /^([A-Z]):/i.exec(path);
						if (res) {
							s.push('<span class="drive">', res[1], '</span>');
						}
					}
					const h = GetIconSize(0, 16);
					s.push('<img draggable="false" src="', r[6], '" style="width:', h, 'px; height:', h, 'px"></td>');
					w -= 20;
				} else if (Addons.TabPlus.opt.Drive) {
					s.push('<td class="drivecell" style="padding-right: 3px; vertical-align: middle; width: 12px">');
					const res = /^([A-Z]):/i.exec(path);
					if (res) {
						s.push('<span class="drive">', res[1], '</span>');
					}
					s.push('&nbsp;</td>');
					w -= 12;
				}
				s.push('<td class="namecell" style="vertical-align: middle;"><div style="overflow: hidden; white-space: nowrap;');
				const bUseClose = Addons.TabPlus.opt.Close && r[4] == S_OK;
				if (bUseClose && Addons.TabPlus.opt.Align > 1 && Addons.TabPlus.opt.Width) {
					w -= r0;
				}
				w += Addons.TabPlus.opt.Width;
				if (w > 0) {
					s.push((Addons.TabPlus.opt.Fix ? 'width: ' : 'max-width:'), w, 'px');
				}
				if (Addons.TabPlus.opt.Align > 1 && Addons.TabPlus.opt.Width) {
					s.push('; text-align: left; max-width: 100%');
				}
				const n = EncodeSC(r[5]);
				if (Addons.TabPlus.opt.Tooltips) {
					s.push('" title="', EncodeSC(path));
				}
				s.push('" >', n, '</div></td>');
				if (bUseClose) {
					s.push('<td class="closecell" style="vertical-align: middle; width: ', r0, 'px" align="right">', Addons.TabPlus.ImgClose, r0, 'px" onclick="Addons.TabPlus.Close(', Id, ",", i, ')" class="button" title="', Addons.TabPlus.str.CloseTab, '" onmouseover="MouseOver(this)" onmouseout="MouseOut()">', Addons.TabPlus.ImgClose2, '</td>');
				}
				s.push('</tr></table>');
				if (!o.innerHTML || bRedraw) {
					o.innerHTML = s.join("");
				}
				const style = o.style;
				if (cl) {
					if (ui_.IEVer >= 10) {
						style.background = "none";
					} else {
						style.filter = "none";
					}
					style.backgroundColor = cl;
				} else {
					if (ui_.IEVer >= 10) {
						style.background = "";
					} else if (style.filter) {
						style.filter = "";
					}
					style.backgroundColor = "";
				}
				Addons.TabPlus.Class(TC, i, FV);
				if (nOldHeight != evTop.offsetHeight) {
					Resize();
				}
			}
		},

		Class: async function (TC, i, FV) {
			if (!FV) {
				FV = await TC[i];
				if (!FV || !await FV.Data) {
					return;
				}
			}
			const r = await Promise.all([FV.Data.Lock, FV.Data.Protect, TC.SelectedIndex, TC.Count, TC.Id]);
			const o = document.getElementById("tabplus_" + r[4] + "_" + i);
			if (o) {
				const arClass = [];
				if (r[0]) {
					arClass.push("locked");
				}
				if (r[1]) {
					arClass.push("protected");
				}
				if (i == r[2]) {
					arClass.unshift('activetab');
					o.style.zIndex = r[3] + 1;
				} else {
					arClass.push(i < r[2] ? 'tab' : 'tab2');
					o.style.zIndex = r[3] - i;
				}
				o.className = arClass.join(" ");
				Addons.TabPlus.SetRect(r[4], i, o);
			};
		},

		SetRect: async function (Id, i, o) {
			let rcItem = await Common.TabPlus.rcItem[Id];
			if (!rcItem) {
				rcItem = await api.CreateObject("Array");
				Common.TabPlus.rcItem[Id] = rcItem;
			}
			rcItem[i] = await GetRect(o);
		},

		Down: async function (ev, Id) {
			Addons.TabPlus.buttons = (ev.buttons != null ? ev.buttons : ev.button);
			Addons.TabPlus.pt.x = ev.screenX * ui_.Zoom;
			Addons.TabPlus.pt.y = ev.screenY * ui_.Zoom;
			const TC = await te.Ctrl(CTRL_TC, Id);
			if (TC) {
				const n = await Addons.TabPlus.FromPt(Id, Addons.TabPlus.pt, true);
				Addons.TabPlus.Click = [Id, n];
				Addons.TabPlus.Button[Id] = await GetGestureButton();
				if (n >= 0) {
					if ((ev.buttons != null ? ev.buttons : ev.button) == 1) {
						TC.SelectedIndex = n;
						TC[n].Focus();
						return false;
					}
				}
			}
			return true;
		},

		Up: async function (ev, Id) {
			const TC = await te.Ctrl(CTRL_TC, Id);
			if (TC) {
				if (/3/.test(Addons.TabPlus.Button[Id])) {
					Addons.TabPlus.GestureExec(TC, ev, Addons.TabPlus.Button[Id]);
					return false;
				}
			}
			Addons.TabPlus.Click = [];
			return true;
		},

		Move: async function (ev, el) {
			const res = /^tabplus_(\d+)_(\d+)/.exec(el.id);
			if (res) {
				if (await api.GetKeyState(VK_LBUTTON) < 0) {
					const pt = await api.Memory("POINT");
					pt.x = ev.screenX * ui_.Zoom;
					pt.y = ev.screenY * ui_.Zoom;
					if (await IsDrag(pt, Addons.TabPlus.pt)) {
						Common.TabPlus.Drag5 = el.id;
						const pdwEffect = [DROPEFFECT_COPY | DROPEFFECT_MOVE | DROPEFFECT_LINK];
						api.SHDoDragDrop(null, await te.Ctrl(CTRL_TC, res[1])[res[2]].FolderItem, te, pdwEffect[0], pdwEffect);
						Common.TabPlus.Drag5 = void 0;
						Addons.TabPlus.pt = pt;
					}
				}
			}
		},

		Popup: async function (ev, Id) {
			const pt = await api.Memory("POINT");
			pt.x = ev.screenX * ui_.Zoom;
			pt.y = ev.screenY * ui_.Zoom;
			const TC = await te.Ctrl(CTRL_TC, Id);
			if (TC) {
				te.OnShowContextMenu(TC, await TC.hwnd, WM_CONTEXTMENU, 0, pt);
			}
		},

		GestureExec: async function (TC, ev, s) {
			if (TC) {
				const pt = await api.Memory("POINT");
				pt.x = ev.screenX * ui_.Zoom;
				pt.y = ev.screenY * ui_.Zoom;
				s = await GetGestureKey() + s;
				if (await TC.HitTest(pt, TCHT_ONITEM) < 0) {
					if (await GestureExec(TC, "Tabs_Background", s, pt, await TC.hwnd) === S_OK) {
						return;
					}
				}
				GestureExec(TC, "Tabs", s, pt, await TC.hwnd);
			}
		},

		DblClick: async function (ev, Id) {
			const pt = await api.Memory("POINT");
			pt.x = ev.screenX * ui_.Zoom;
			pt.y = ev.screenY * ui_.Zoom;
			if (await IsDrag(pt, Addons.TabPlus.pt)) {
				return;
			}
			const TC = await te.Ctrl(CTRL_TC, Id);
			Addons.TabPlus.GestureExec(TC, ev, Addons.TabPlus.Button[Id] + Addons.TabPlus.Button[Id]);
		},

		Select: function (Id, nIndex) {
			te.Ctrl(CTRL_TC, Id).SelectedIndex = nIndex;
		},

		Start5: function (ev, o) {
			if (Addons.TabPlus.buttons == 1) {
				ev.dataTransfer.effectAllowed = 'move';
				ev.dataTransfer.setData("text", o.title);
				Common.TabPlus.Drag5 = o.id;
				return true;
			}
			return false;
		},

		End5: async function (ev) {
			if (await api.GetKeyState(VK_RBUTTON) >= 0 && await api.GetKeyState(VK_ESCAPE) >= 0) {
				const res = /^tabplus_(\d+)_(\d+)/.exec(await Common.TabPlus.Drag5);
				if (res) {
					const pt = await api.Memory("POINT");
					pt.x = ev.screenX * ui_.Zoom;
					pt.y = ev.screenY * ui_.Zoom;
					const hwnd1 = await api.WindowFromPoint(pt);
					if (ui_.hwnd != hwnd1 && !await api.IsChild(ui_.hwnd, hwnd1)) {
						const FV = await te.Ctrl(CTRL_TC, res[1])[res[2]];
						await OpenInExplorer(FV);
						FV.Close();
					}
				}
			}
			Common.TabPlus.Drag5 = void 0;
		},

		Close: async function (Id, i) {
			const FV = await te.Ctrl(CTRL_TC, Id)[i];
			FV.Close();
		},

		Wheel: async function (ev, Id) {
			const TC = await te.Ctrl(CTRL_TC, Id);
			if (TC) {
				const o = document.getElementById("tabplus_" + Id);
				if (o.clientWidth == o.offsetWidth) {
					Addons.TabPlus.GestureExec(TC, ev, ev.wheelDelta > 0 ? "8" : "9");
				}
			}
		},

		FromPt: async function (Id, pt, bNoClose) {
			const x = await pt.x - screenLeft * ui_.Zoom;
			const y = await pt.y - screenTop * ui_.Zoom;
			const re = new RegExp("tabplus_" + Id + "_(\\d+)", "");
			for (let el = document.elementFromPoint(x, y); el && !/UL/i.test(el.tagName); el = el.parentElement) {
				if (bNoClose && /closecell/.test(el.className)) {
					return -1;
				}
				const res = re.exec(el.id);
				if (res) {
					return res[1];
				}
			}
			return -1;
		},

		Resize: function () {
			if (Addons.TabPlus.tidResize) {
				return;
			}
			Addons.TabPlus.tidResize = setTimeout(async function () {
				Addons.TabPlus.tidResize = null;
				const cTC = await te.Ctrls(CTRL_TC, true);
				for (let j = await GetLength(cTC); j-- > 0;) {
					const TC = await cTC[j];
					const id = await TC.Id;
					Addons.TabPlus.Arrange(id);
					if (Addons.TabPlus.opt.Align > 1) {
						const elTab = document.getElementById("tabplus_" + id);
						const elPanel = document.getElementById("Panel_" + id);
						if (elTab && elPanel) {
							elTab.style.height = elPanel.clientHeight + "px";
						}
					}
				}
			}, 500);
		},

		Over: async function (Id, pt) {
			if (await Common.TabPlus.bDropping) {
				return;
			}
			if (!await IsDrag(pt, await g_.ptDrag)) {
				const nIndex = await Addons.TabPlus.FromPt(Id, pt);
				if (nIndex >= 0) {
					const TC = await te.Ctrl(CTRL_TC, Id);
					if (Addons.TabPlus.opt.NoDragOpen) {
						setTimeout(Addons.TabPlus.Select, 500, Id, await TC.SelectedIndex);
					}
					TC.SelectedIndex = nIndex;
				}
			}
		},

		DragOver: function (Id, pt) {
			if (Addons.TabPlus.tid) {
				clearTimeout(Addons.TabPlus.tid);
			}
			Addons.TabPlus.tid = setTimeout(Addons.TabPlus.Over, 300, Id, pt);
		},

		DragLeave: function () {
			if (Addons.TabPlus.tid) {
				clearTimeout(Addons.TabPlus.tid);
				delete Addons.TabPlus.tid;
			}
		},

		SetRects: async function () {
			const cTC = await te.Ctrls(CTRL_TC, true);
			const nCount = await cTC.Count;
			for (let i = 0; i < nCount; ++i) {
				const TC = await cTC[i];
				const Id = await TC.Id;
				let o = document.getElementById("tabplus_" + Id);
				if (o) {
					Common.TabPlus.rc[Id] = await GetRect(o);
					const nCount1 = await TC.Count;
					Common.TabPlus.rcItem[Id] = await api.CreateObject("Array");
					for (let j = 0; j < nCount1; ++j) {
						o = document.getElementById("tabplus_" + Id + "_" + j);
						if (o) {
							Addons.TabPlus.SetRect(Id, j, o);
						}
					}
				}
			}
		}
	};

	Common.TabPlus = await api.CreateObject("Object");
	Common.TabPlus.opt = await api.CreateObject("Object");

	$.importScript("addons\\" + Addon_Id + "\\sync.js");

	AddEvent("PanelCreated", function (Ctrl, Id) {
		const s = ['<ul id="tabplus_$" class="tab0" oncontextmenu="Addons.TabPlus.Popup(event, $);return false"'];
		s.push(' ondblclick="Addons.TabPlus.DblClick(event, $);return false" onmousewheel="Addons.TabPlus.Wheel(event, $)" onresize="Resize();"');
		s.push(' onmousedown="Addons.TabPlus.Down(event, $)" onmouseup="return Addons.TabPlus.Up(event, $)" onclick="return false;" style="width: 100%"></ul>');
		const n = Addons.TabPlus.opt.Align || 0;
		const arAlign = ["InnerTop_", "InnerBottom_", "InnerLeft_", "InnerRight_"];
		let o = document.getElementById(SetAddon(null, arAlign[n] + Id, s.join("").replace(/\$/g, Id)));
		if (n > 1) {
			const w = (Number(Addons.TabPlus.opt.Width || 84) + 17) + "px";
			o.style.width = w;
			o = document.getElementById("tabplus_" + Id);
			o.style.width = w;
			o.style.height = "0";
			o.style.overflow = "auto";
		} else {
			o.style.overflow = "hidden";
		}
		o.style.overflowX = "hidden";
	});

	AddEvent("Lock", function (Ctrl, i, bLock) {
		Addons.TabPlus.Style(Ctrl, i, true)
	});

	AddEvent("VisibleChanged", async function (Ctrl) {
		if (await Ctrl.Type == CTRL_TC) {
			if (await Ctrl.Visible) {
				Addons.TabPlus.SetActiveColor(await Ctrl.Id);
			}
			Addons.TabPlus.Resize();
		}
	});

	AddEvent("SelectionChanging", async function (Ctrl) {
		if (await Ctrl.Type == CTRL_TC) {
			Addons.TabPlus.nSelected[await Ctrl.Id] = await Ctrl.SelectedIndex;
		}
	});

	AddEvent("SelectionChanged", async function (Ctrl) {
		if (await Ctrl.Type == CTRL_TC) {
			const Id = await Ctrl.Id;
			Addons.TabPlus.Class(Ctrl, await Ctrl.SelectedIndex);
			Addons.TabPlus.Class(Ctrl, Addons.TabPlus.nSelected[Id]);
			Addons.TabPlus.Arrange(Id);
		}
	});

	AddEvent("Arrange", async function (Ctrl) {
		if (await Ctrl.Type == CTRL_TC) {
			Addons.TabPlus.Arrange(await Ctrl.Id);
		}
	});

	AddEvent("ChangeView", async function (Ctrl) {
		const TC = await Ctrl.Parent;
		if (TC) {
			const Id = await TC.Id;
			const i = Addons.TabPlus.nIndex[Id];
			let o = document.getElementById("tabplus_" + Id + "_" + i);
			if (o) {
				await Addons.TabPlus.Style(TC, i, true)
				o = document.getElementById("tabplus_" + Id);
				if (o) {
					if (await TC.Count + (Addons.TabPlus.opt.New ? 1 : 0) != o.getElementsByTagName("li").length) {
						o = null;
					}
				}
			}
			if (!o) {
				Addons.TabPlus.SelectionChanged(TC, Id);
			}
		}
	});

	AddEvent("Create", async function (Ctrl) {
		Addons.TabPlus.SelectionChanged(Ctrl, await Ctrl.Id);
	});

	AddEvent("CloseView", async function (Ctrl) {
		const TC = await Ctrl.Parent;
		if (TC) {
			Addons.TabPlus.SelectionChanged(TC, await TC.Id);
		}
	});

	AddEvent("Resize", function () {
		Addons.TabPlus.Resize();
	});

	//Init
	te.Tab = false;
	const attrs = item.attributes;
	for (let i = attrs.length; i-- > 0;) {
		Common.TabPlus.opt[attrs[i].name] = Addons.TabPlus.opt[attrs[i].name] = attrs[i].value;
	}
	if (Addons.TabPlus.opt.Tooltips) {
		Addons.TabPlus.str.CloseTab = await GetText("Close Tab");
		Addons.TabPlus.str.NewTab = await GetText("New tab");
	}
	Addons.TabPlus.opt.Width = GetNum(Addons.TabPlus.opt.Width);
	Addons.TabPlus.opt.IconSize = GetNum(Addons.TabPlus.opt.IconSize) || 13;
	const r0 = Math.round(Addons.TabPlus.opt.IconSize * screen.deviceYDPI / 96);
	let s = Addons.TabPlus.opt.IconLock;
	Addons.TabPlus.ImgLock = await MakeImgSrc(s || "bitmap:ieframe.dll,545,13,2", 0, true, r0);
	if (s || WINVER < 0x0602) {
		Addons.TabPlus.ImgLock2 = '<img draggable="false" src="' + Addons.TabPlus.ImgLock + '" style="width: ' + r0 + 'px">';
	} else {
		Addons.TabPlus.ImgLock2 = '<span style="font-size: ' + r0 + 'px">&#128204;</span>';
	}
	if (s = Addons.TabPlus.opt.IconClose) {
		Addons.TabPlus.ImgClose = '<img draggable="false" src="' + await MakeImgSrc(s, 0, true, r0) + '" style="width: ';
		Addons.TabPlus.ImgClose2 = '';
	} else {
		Addons.TabPlus.ImgClose = '<span style="font-family: marlett; font-size: ';
		Addons.TabPlus.ImgClose2 = '&#x72;</span>';
	}
	if (s = Addons.TabPlus.opt.IconProtect) {
		Addons.TabPlus.ImgProtect = '<img draggable="false" src="' + await MakeImgSrc(s, 0, true, r0) + '" style="width: ' + r0 + 'px">';
	} else {
		Addons.TabPlus.ImgProtect = '<span style="font-size: ' + r0 + 'px">&#x2764;</span>';
	}
	if (Addons.TabPlus.opt.Icon) {
		Addons.TabPlus.opt.clBtnFace = await GetSysColor(COLOR_BTNFACE);
	}
} else {
	const Icon = document.F.Icon;
	if (Icon) {
		Icon.name = "Icon_0";
	}
	await SetTabContents(0, "General", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));
	document.getElementById("_Drive").innerHTML = (await api.LoadString(hShell32, 4122)).replace(/ %c:?/, "");
}
