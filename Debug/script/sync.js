//Tablacus Explorer

Ctrl = null;
g_temp = null;
Handled = null;
hwnd = null;
pt = api.Memory("POINT");
dataObj = null;
grfKeyState = null;
pdwEffect = [0];
bDrop = null;
Input = null;
eventTE = api.CreateObject("Object");
eventTE.Environment = api.CreateObject("Object");
eventTA = api.CreateObject("Object");

g_ptDrag = api.Memory("POINT");
window.Common = api.CreateObject("Object");
Common["_stack"] = api.CreateObject("Array");
window.Sync = api.CreateObject("Object");

g_ = api.CreateObject("Object");
g_.Colors = api.CreateObject("Object")
g_.KeyCode = api.CreateObject("Object");
g_.KeyState = api.CreateObject("Array");
const ar = [
	[0x1d0000, 0x2000],
	[0x2a0000, 0x1000],
	[0x380000, 0x4000],
	["Win", 0x8000],
	["Ctrl", 0x2000],
	["Shift", 0x1000],
	["Alt", 0x4000]
];
for (let i in ar) {
	const a2 = api.CreateObject("Array");
	a2.push(ar[i][0], ar[i][1]);
	g_.KeyState.push(a2);
}
g_.stack_TC = api.CreateObject("Object");
g_.dlgs = api.CreateObject("Object");
g_.bWindowRegistered = true;
g_.xmlWindow = null;
g_.elAddons = api.CreateObject("Object");
g_.event = api.CreateObject("Object");
g_.tid_rf = api.CreateObject("Array");
g_.Autocomplete = api.CreateObject("Object");
g_.LockUpdate = 0;
g_.ptMenuDrag = api.Memory("POINT");
g_.Locations = api.CreateObject("Object");
g_.IEVer = window.chrome ? (/Edg\/(\d+)/.test(navigator.appVersion) ? RegExp.$1 : 12) : ScriptEngineMajorVersion() > 8 ? ScriptEngineMajorVersion() : ScriptEngineMinorVersion();
g_.bit = api.sizeof("HANDLE") * 8;

AboutTE = function (n) {
	if (n == 0) {
		return te.Version < 20201219 ? te.Version : 20210130;
	}
	if (n == 1) {
		const v = AboutTE(0);
		return [parseInt(v / 10000) % 100, parseInt(v / 100) % 100, v % 100].join(".");
	}
	if (n == 2) {
		return "Tablacus Explorer " + AboutTE(1) + " Gaku";
	}
	const ar = ["TE" + g_.bit, AboutTE(1)];
	let s = "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\";
	try {
		ar.push(wsh.regRead(s + "ProductName"));
		if (s = wsh.regRead(s + "ReleaseId")) {
			ar.push(s);
		}
	} catch (e) { }
	ar.push("(" + [osInfo.dwMajorVersion, osInfo.dwMinorVersion, osInfo.dwBuildNumber].join(".") + ")");
	const ext = {
		Wow64: api.IsWow64Process(api.GetCurrentProcess()),
		Admin: api.SHTestTokenMembership(null, 0x220),
		Dark: api.ShouldAppsUseDarkMode()
	}
	for (let s in ext) {
		if (ext[s]) {
			ar.push(s);
		}
	}
	const res = window.chrome && /(Edg\/[\d\.]+)/.exec(navigator.appVersion);
	ar.push(res ? res[1] : 'IE/' + g_.IEVer);
	ar.push("JS/" + ("undefined" == typeof ScriptEngineMajorVersion ? "Chakra" : [ScriptEngineMajorVersion(), ScriptEngineMinorVersion(), ScriptEngineBuildVersion()].join(".")));
	ar.push(GetLangId(2), screen.deviceYDPI);

	const server = te.GetObject("winmgmts:\\\\.\\root\\SecurityCenter" + (WINVER >= 0x600 ? "2" : ""));
	if (server) {
		const cols = server.ExecQuery("SELECT * FROM AntiVirusProduct");
		for (let list = api.CreateObject("Enum", cols); !list.atEnd(); list.moveNext()) {
			ar.push(list.item().displayName);
		}
	}
	return ar.join(" ");
}

if ("undefined" != typeof ScriptEngineMajorVersion && ScriptEngineMajorVersion() < 10) {
	(function (f) {
		if (f) {
			window.setTimeout = function () {
				var args = Array.apply(null, arguments);
				var fn = args.shift();
				var tm = args.shift();
				try {
					return f(function () {
						try {
							if ("string" === typeof fn) {
								fn = new AsyncFunction(fn);
							}
							fn.apply(fn, args);
						} catch (e) {
							ShowError(e, fn.toString());
						}
					}, tm);
				} catch (e) {
					ShowError(e);
				}
			}
		}
	})(setTimeout);
}

GetFolderView = function (Ctrl, pt, bStrict) {
	if (!Ctrl) {
		return te.Ctrl(CTRL_FV);
	}
	const nType = Ctrl.Type;
	if (nType <= CTRL_EB) {
		return Ctrl;
	}
	if (nType == CTRL_TV) {
		return Ctrl.FolderView;
	}
	if (nType != CTRL_TC) {
		return te.Ctrl(CTRL_FV);
	}
	if (pt) {
		const FV = Ctrl.HitTest(pt);
		if (FV) {
			return FV;
		}
	}
	if (!bStrict || !pt) {
		return Ctrl.Selected;
	}
}

GetSelectedArray = function (Ctrl, pt, bPlus) {
	let Selected, SelItem;
	let FV = null;
	let bSel = true;
	switch (Ctrl.Type) {
		case CTRL_SB:
		case CTRL_EB:
			FV = Ctrl;
			break;
		case CTRL_TC:
			FV = Ctrl.HitTest(pt);
			bSel = false;
			break;
		case CTRL_TV:
			FV = Ctrl.FolderView;
			SelItem = Ctrl.SelectedItem;
			break;
		case CTRL_WB:
			FV = te.Ctrl(CTRL_FV);
			SelItem = window.Input;
			break;
		default:
			FV = te.Ctrl(CTRL_FV);
			break;
	}
	if (FV && !SelItem) {
		if (bSel) {
			Selected = FV.SelectedItems();
		}
		if (Selected && Selected.Count) {
			SelItem = Selected.Item(0);
		} else {
			SelItem = FV.FolderItem;
		}
	}
	if (!Selected || Selected.Count == 0) {
		Selected = api.CreateObject("FolderItems");
		if (bPlus) {
			Selected.AddItem(SelItem);
		}
	}
	const r = api.CreateObject("Array");
	r.push(Selected, SelItem, FV);
	return r;
}

ChooseColor = function (c) {
	const cc = api.Memory("CHOOSECOLOR");
	cc.lStructSize = cc.Size;
	cc.hwndOwner = api.GetForegroundWindow();
	cc.Flags = CC_FULLOPEN | CC_RGBINIT;
	cc.rgbResult = c;
	cc.lpCustColors = te.Data.CustColors;
	if (api.ChooseColor(cc)) {
		return cc.rgbResult;
	}
}

ChooseWebColor = function (c) {
	c = ChooseColor(GetWinColor(c));
	if (c != null) {
		return GetWebColor(c);
	}
}

RegEnumKey = function (hKey, Name, bSA) {
	const server = te.GetObject("winmgmts:\\\\.\\root\\default:StdRegProv");
	const method = server.Methods_.Item("EnumKey");
	const iParams = method.InParameters.SpawnInstance_();
	iParams.hDefKey = hKey;
	iParams.sSubKeyName = Name;
	const r = server.ExecMethod_(method.Name, iParams).sNames;
	return bSA ? r : r.toArray ? r.toArray() : api.CreateObject("Array", r);
}

OpenDialog = function (path, bFilesOnly) {
	return OpenDialogEx(path, null, bFilesOnly);
}

ChooseFolder = function (path, pt, uFlags) {
	if (!pt) {
		pt = api.Memory("POINT");
		api.GetCursorPos(pt);
	}
	let FolderItem = api.ILCreateFromPath(path);
	FolderItem = FolderMenu.Open(FolderItem.IsFolder ? FolderItem : ssfDRIVES, pt.x, pt.y);
	if (FolderItem) {
		return api.GetDisplayNameOf(FolderItem, uFlags || SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_FORPARSINGEX);
	}
}

BrowseForFolder = function (path) {
	return OpenDialogEx(path, api.LoadString(hShell32, 4131) + "|<Folder>");
}

OpenDialogEx = function (path, filter, bFilesOnly) {
	const commdlg = api.CreateObject("CommonDialog");
	const res = /^\.\.(\/.*)/.exec(path);
	if (res) {
		path = te.Data.Installed + (res[1].replace(/\//g, "\\"));
	}
	path = ExtractPath(te, path);
	if (!api.PathIsDirectory(path)) {
		path = GetParentFolderName(path);
		if (!api.PathIsDirectory(path)) {
			path = fso.GetDriveName(te.Data.Installed);
		}
	}
	commdlg.InitDir = path;
	commdlg.Filter = MakeCommDlgFilter(filter);
	commdlg.Flags = OFN_FILEMUSTEXIST | OFN_EXPLORER | OFN_ENABLESIZING | (bFilesOnly ? 0 : OFN_ENABLEHOOK);
	if (commdlg.ShowOpen()) {
		return PathQuoteSpaces(commdlg.FileName);
	}
}

InvokeCommand = function (Items, fMask, hwnd, Verb, Parameters, Directory, nShow, dwHotKey, hIcon, FV, uCMF) {
	if (Items) {
		const ContextMenu = api.ContextMenu(Items, FV);
		if (ContextMenu) {
			const hMenu = api.CreatePopupMenu();
			ContextMenu.QueryContextMenu(hMenu, 0, 1, 0x7FFF, uCMF);
			if (Verb === null) {
				Verb = api.GetMenuDefaultItem(hMenu, MF_BYCOMMAND, GMDI_USEDISABLED) - 1;
				if (Verb == -2) {
					api.DestroyMenu(hMenu);
					return S_FALSE;
				}
			}
			ContextMenu.InvokeCommand(fMask, hwnd, Verb, Parameters, Directory, nShow, dwHotKey, hIcon);
			api.DestroyMenu(hMenu);
		}
	}
	return S_OK;
}

FindChildByClass = function (hwnd, s) {
	var hwnd1, hwnd2;
	while (hwnd1 = api.FindWindowEx(hwnd, hwnd1, null, null)) {
		if (api.PathMatchSpec(api.GetClassName(hwnd1), s)) {
			return hwnd1;
		}
		if (hwnd2 = FindChildByClass(hwnd1, s)) {
			return hwnd2;
		}
	}
	return null;
}

GetNavigateFlags = function (FV, bParent) {
	if (!FV && OpenMode != SBSP_NEWBROWSER) {
		FV = te.Ctrl(CTRL_FV);
	}
	return (!bParent && api.GetKeyState(VK_MBUTTON) < 0) || api.GetKeyState(VK_CONTROL) < 0 || GetLock(FV) ? SBSP_NEWBROWSER : OpenMode;
}

GetSysColor = function (i) {
	const c = g_.Colors[i];
	return c != null ? c : api.GetSysColor(i);
}

SetSysColor = function (i, color) {
	g_.Colors[i] = color;
}

ShellExecute = function (s, vOperation, nShow, vDir2, pt) {
	var cmd = ExtractMacro(te, s);
	var res = /^\s*"([^"]*)"\s*(.*)/.exec(cmd) || /^\s*([^\s]*)\s*(.*)/.exec(cmd);
	if (res) {
		var vDir = GetParentFolderName(res[1]) || vDir2;
		if (pt && vDir.Type) {
			vDir = (GetFolderView(Ctrl, pt) || { FolderItem: {} }).FolderItem.Path;
		}
		return sha.ShellExecute(res[1], res[2], vDir, vOperation, nShow);
	}
}

RunEvent1 = function () {
	const args = Array.apply(null, arguments);
	const en = args.shift();
	const eo = eventTE[en.toLowerCase()];
	for (let i in eo) {
		try {
			api.Invoke(eo[i], args);
		} catch (e) {
			ShowError(e, en, i);
		}
	}
}

RunEvent2 = function () {
	const args = Array.apply(null, arguments);
	const en = args.shift();
	const eo = eventTE[en.toLowerCase()];
	for (let i in eo) {
		try {
			var hr = api.Invoke(eo[i], args);
			if (isFinite(hr) && hr != S_OK) {
				return hr;
			}
		} catch (e) {
			ShowError(e, en, i);
		}
	}
	return S_OK;
}

RunEvent3 = function () {
	const args = Array.apply(null, arguments);
	const en = args.shift();
	const eo = eventTE[en.toLowerCase()];
	for (let i in eo) {
		try {
			const hr = api.Invoke(eo[i], args);
			if (isFinite(hr)) {
				return hr;
			}
		} catch (e) {
			ShowError(e, en, i);
		}
	}
}

RunEvent4 = function () {
	const args = Array.apply(null, arguments);
	const en = args.shift();
	const eo = eventTE[en.toLowerCase()];
	for (let i in eo) {
		try {
			const r = api.Invoke(eo[i], args);
			if (r !== void 0) {
				return r;
			}
		} catch (e) {
			ShowError(e, en, i);
		}
	}
}

RunEventUI = function () {
	const args = Array.apply(null, arguments);
	const eo = MainWindow.eventTE[args[0].toLowerCase()];
	for (let i in eo) {
		args[0] = eo[i];
		InvokeUI("ExecJavaScript", args);
	}
}

ExtractMacro2 = function (Ctrl, s) {
	for (var j = 99; j--;) {
		var s1 = s;
		for (var i in eventTE.replacemacroex) {
			s = s.replace(eventTE.replacemacroex[i][0], eventTE.replacemacroex[i][1]);
		}
		for (var i in eventTE.replacemacro) {
			var re = eventTE.replacemacro[i][0];
			var res = re.exec(s);
			if (res) {
				var r = eventTE.replacemacro[i][1](Ctrl, re, res);
				if (/^string$|^number$/i.test(typeof r)) {
					s = s.replace(re, r);
				}
			}
		}
		for (var i in eventTE.extractmacro) {
			var re = eventTE.extractmacro[i][0];
			if (re.test(s)) {
				s = eventTE.extractmacro[i][1](Ctrl, s, re);
			}
		}
		s = s.replace(/%([\w\-_]+)%/g, function (strMatch, ref) {
			var fn = eventTE.Environment[ref.toLowerCase()];
			if (/^string$|^number$/i.test(typeof fn)) {
				return fn;
			} else if (fn) {
				try {
					var r = fn(Ctrl);
					if (/^string$|^number$/i.test(typeof r)) {
						return r;
					}
				} catch (e) { }
			}
			return strMatch;
		});
		s = wsh.ExpandEnvironmentStrings(s);
		if (s == s1) {
			break;
		}
	}
	return s;
}

ExtractMacro = function (Ctrl, s) {
	if (!Ctrl) {
		Ctrl = te;
	}
	if ("string" === typeof s) {
		s = MainWindow.ExtractMacro2(Ctrl, s);
		if (!/\t/.test(s) && /%/.test(s)) {
			do {
				s = MainWindow.ExtractMacro2(Ctrl, s.replace(/%/, "\t"));
			} while (/%/.test(s));
			s = s.replace(/\t/g, "%");
		}
	}
	return s;
}

OrganizePath = function (fn, base) {
	fn = ExtractPath(te, fn);
	if (base && !/^[A-Z]:\\|^\\\\\w/i.test(fn)) {
		fn = BuildPath(base, fn);
	}
	return fn;
}

OpenAdodbFromTextFile = function (fn, charset, base) {
	fn = OrganizePath(fn, base || te.Data.Installed);
	const ado = api.CreateObject("ads");
	if (charset) {
		try {
			ado.CharSet = charset;
			ado.Open();
			ado.LoadFromFile(fn);
		} catch (e) {
			ado.Close();
			return;
		}
		return ado;
	}
	try {
		ado.Type = adTypeBinary;
		ado.Open();
		ado.LoadFromFile(fn);
		var s = ado.Read(8192);
	} catch (e) {
		ado.Close();
		return;
	}
	charset = MainWindow.RunEvent4("DetectCharSet", s, fn);
	if (!charset) {
		s = api.SysAllocString(s, 28591);
		charset = "_autodetect_all";
		if (/^\xEF\xBB\xBF|^([\x09\x0A\x0D\x20-\x7E]|[\xC2-\xDF][\x80-\xBF]|\xE0[\xA0-\xBF][\x80-\xBF]|[\xE1-\xEC\xEE\xEF][\x80-\xBF]{2}|\xED[\x80-\x9F][\x80-\xBF]|\xF0[\x90-\xBF][\x80-\xBF]{2}|[\xF1-\xF3][\x80-\xBF]{3}|\xF4[\x80-\x8F][\x80-\xBF]{2})*[\x80-\xBF]{0,3}$/.test(s)) {
			charset = 'utf-8';
		} else if (/^\xFF\xFE|^\xFE\xFF/.test(s)) {
			charset = 'unicode';
		}
	}
	ado.Position = 0;
	ado.Type = adTypeText;
	ado.CharSet = charset;
	return ado;
}

ReadTextFile = function (fn, bDetect, base) {
	const ado = OpenAdodbFromTextFile(fn, bDetect ? null : "utf-8", base);
	if (ado) {
		const src = ado.ReadText();
		ado.Close();
		return src;
	}
	return "";
}

WriteTextFile = function (fn, src, base) {
	let r;
	const ado = api.CreateObject("ads");
	if (ado) {
		ado.CharSet = "utf-8";
		ado.Open();
		try {
			ado.WriteText(src);
			ado.SaveToFile(OrganizePath(fn, base || te.Data.DataFolder), adSaveCreateOverWrite);
		} catch (e) {
			r = "WriteTextFileError: " + fn;
		}
		ado.Close();
	}
	return r;
}

AddEvent = function (Name, fn, priority) {
	if (Name) {
		const en = Name.toLowerCase();
		const s = en.replace(/\d$/g, "");
		if (g_.event[s] && !te["On" + s]) {
			te["On" + s] = g_.event[s];
		}
		if (!eventTE[en]) {
			eventTE[en] = api.CreateObject("Array");
		}
		if (!eventTA[en]) {
			eventTA[en] = api.CreateObject("Array");
		}
		if (priority) {
			eventTE[en].unshift(fn);
			eventTA[en].unshift(g_.Error_source);
		} else {
			eventTE[en].push(fn);
			eventTA[en].push(g_.Error_source);
		}
	}
}

ClearEvent = function (Name) {
	if (Name) {
		var en = Name.toLowerCase();
		delete eventTE[en];
		delete eventTA[en];
	}
}

AddEnv = function (Name, fn) {
	eventTE.Environment[Name.toLowerCase()] = fn;
}

AddEventId = function (Name, Id, fn) {
	var en = Name.toLowerCase();
	if (!eventTE[en]) {
		eventTE[en] = api.CreateObject("Object");
	}
	eventTE[en][Id.toLowerCase()] = fn;
}

AddonDisabled = function (Id) {
	RunEvent1("AddonDisabled", Id);
	if (eventTE.addondisabledex) {
		Id = Id.toLowerCase();
		if (Id == "tabgroups") {
			return;
		}
		var fn = eventTE.addondisabledex[Id];
		if (fn) {
			delete eventTE.addondisabledex[Id];
			AddEvent("Finalize", fn);
		}
	}
	CollectGarbage();
}

LoadXml = function (filename, nGroup) {
	let items, Installed, re;
	let xml = filename;
	g_.fTCs = 0;
	if ("string" === typeof filename) {
		filename = ExtractPath(te, filename);
		if (fso.FileExists(filename)) {
			xml = api.CreateObject("Msxml2.DOMDocument");
			xml.async = false;
			xml.load(filename);
		}
	}
	try {
		items = xml.getElementsByTagName('Window');
	} catch (e) { }
	if (items && items.length) {
		Installed = items[0].getAttribute("Installed");
		if (!SameText(Installed, te.Data.Installed)) {
			re = Installed + ";" + Installed + "\\*";
		}
	}
	try {
		items = xml.getElementsByTagName('Ctrl');
	} catch (e) {
		return;
	}
	++g_.LockUpdate;
	te.LockUpdate();
	const cTC = te.Ctrls(CTRL_TC);
	for (let i in cTC) {
		if (!nGroup || cTC[i].Data.Group == nGroup) {
			cTC[i].Close();
		}
	}
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		switch (item.getAttribute("Type") - 0) {
			case CTRL_TC:
				const TC = te.CreateCtrl(CTRL_TC, item.getAttribute("Left"), item.getAttribute("Top"), item.getAttribute("Width"), item.getAttribute("Height"), item.getAttribute("Style"), item.getAttribute("Align"), item.getAttribute("TabWidth"), item.getAttribute("TabHeight"));
				TC.Data.Group = nGroup || GetNum(item.getAttribute("Group"));
				const tabs = item.getElementsByTagName('Ctrl');
				for (let i2 = 0; i2 < tabs.length; ++i2) {
					const tab = tabs[i2];
					let Path = tab.getAttribute("Path");
					const logs = tab.getElementsByTagName('Log');
					const nLogCount = logs.length;
					if (nLogCount > 1) {
						Path = api.CreateObject("FolderItems");
						for (let i3 = 0; i3 < nLogCount; ++i3) {
							let path3 = logs[i3].getAttribute("Path");
							if (re && api.PathMatchSpec(path3, re)) {
								path3 = te.Data.Installed + path3.substr(Installed.length)
							}
							Path.AddItem(path3);
						}
						Path.Index = tab.getAttribute("LogIndex");
					} else if (re && api.PathMatchSpec(Path, re)) {
						Path = te.Data.Installed + Path.substr(Installed.length)
					}
					const FV = TC.Selected.Navigate2(Path, SBSP_NEWBROWSER, tab.getAttribute("Type"), tab.getAttribute("ViewMode"), tab.getAttribute("FolderFlags"), tab.getAttribute("Options"), tab.getAttribute("ViewFlags"), tab.getAttribute("IconSize"), tab.getAttribute("Align"), tab.getAttribute("Width"), tab.getAttribute("Flags"), tab.getAttribute("EnumFlags"), tab.getAttribute("RootStyle"), tab.getAttribute("Root"));
					if (!FV.FilterView) {
						FV.FilterView = tab.getAttribute("FilterView");
					}
					FV.Data.Lock = GetNum(tab.getAttribute("Lock")) != 0;
					Lock(TC, i2, false);
					ChangeTabName(FV);
					MainWindow.RunEvent1("LoadFV", FV, tab);
				}
				TC.SelectedIndex = item.getAttribute("SelectedIndex");
				TC.Visible = GetNum(item.getAttribute("Visible"));
				if (TC.Visible) {
					g_.focused = TC.Selected;
					++g_.fTCs;
				}
				MainWindow.RunEvent1("LoadTC", TC, item);
				break;
		}
	}
	if (!nGroup) {
		MainWindow.RunEvent1("LoadWindow", xml);
	}
	te.UnlockUpdate();
	--g_.LockUpdate;
}

SaveXmlTC = function (Ctrl, xml, nGroup) {
	const item = xml.createElement("Ctrl");
	item.setAttribute("Type", Ctrl.Type);
	item.setAttribute("Left", Ctrl.Left);
	item.setAttribute("Top", Ctrl.Top);
	item.setAttribute("Width", Ctrl.Width);
	item.setAttribute("Height", Ctrl.Height);
	item.setAttribute("Style", Ctrl.Style);
	item.setAttribute("Align", Ctrl.Align);
	item.setAttribute("TabWidth", Ctrl.TabWidth);
	item.setAttribute("TabHeight", Ctrl.TabHeight);
	item.setAttribute("SelectedIndex", Ctrl.SelectedIndex);
	item.setAttribute("Visible", GetNum(Ctrl.Visible));
	item.setAttribute("Group", GetNum(nGroup || Ctrl.Data.Group));

	let bEmpty = true;
	const nCount2 = Ctrl.Count;
	for (let i2 in Ctrl) {
		const FV = Ctrl[i2];
		let path = GetSavePath(FV.FolderItem);
		let bSave = IsSavePath(path);
		if (bSave || (bEmpty && i2 == nCount2 - 1)) {
			if (!bSave) {
				path = HOME_PATH;
			}
			const item2 = xml.createElement("Ctrl");
			item2.setAttribute("Type", FV.Type);
			item2.setAttribute("Path", path);
			item2.setAttribute("FolderFlags", FV.FolderFlags);
			item2.setAttribute("ViewMode", FV.CurrentViewMode);
			item2.setAttribute("IconSize", FV.IconSize);
			item2.setAttribute("Options", FV.Options);
			item2.setAttribute("ViewFlags", FV.ViewFlags);
			item2.setAttribute("FilterView", FV.FilterView);
			item2.setAttribute("Lock", GetNum(FV.Data.Lock));
			const TV = FV.TreeView;
			item2.setAttribute("Align", TV.Align);
			item2.setAttribute("Width", TV.Width);
			item2.setAttribute("Flags", TV.Style);
			item2.setAttribute("EnumFlags", TV.EnumFlags);
			item2.setAttribute("RootStyle", TV.RootStyle);
			item2.setAttribute("Root", String(TV.Root));
			const TL = FV.History;
			if (TL) {
				if (TL.Count > 1) {
					let bLogSaved = false;
					let nLogIndex = TL.Index;
					for (let i3 in TL) {
						path = GetSavePath(TL[i3]);
						if (IsSavePath(path)) {
							const item3 = xml.createElement("Log");
							item3.setAttribute("Path", path);
							item2.appendChild(item3);
							bLogSaved = true;
						} else if (i3 < nLogIndex) {
							--nLogIndex;
						}
					}
					if (bLogSaved) {
						item2.setAttribute("LogIndex", nLogIndex);
					}
				}
			}
			MainWindow.RunEvent1("SaveFV", FV, item2);
			item.appendChild(item2);
			bEmpty = false;
		}
	}
	MainWindow.RunEvent1("SaveTC", Ctrl, item);
	xml.documentElement.appendChild(item);
}

SaveConfigXML = function (filename) {
	var xml = CreateXml(true);
	var root = xml.documentElement;

	for (var i in te.Data) {
		var res = /^(Tab|Tree|View|Conf)_(.*)/.exec(i);
		if (res) {
			if (isFinite(te.Data[i]) || te.Data[i] != "") {
				var item = xml.createElement(res[1]);
				item.setAttribute("Id", res[2]);
				item.text = te.Data[i];
				root.appendChild(item);
			}
		}
	}

	MainWindow.RunEvent1("SaveConfig", xml);
	try {
		xml.save(PathUnquoteSpaces(filename));
	} catch (e) {
		if (e.number != E_ACCESSDENIED) {
			ShowError(e, [GetText("Save"), filename].join(": "));
		}
	}
}

SaveXml = function (filename) {
	const xml = CreateXml(true);
	const root = xml.documentElement;
	const item = xml.createElement("Window");
	if (!api.IsZoomed(te.hwnd) && !api.IsIconic(te.hwnd)) {
		api.GetWindowRect(te.hwnd, te.Data.rcWindow);
	}
	item.setAttribute("Left", te.Data.rcWindow.left);
	item.setAttribute("Top", te.Data.rcWindow.top);
	item.setAttribute("Width", te.Data.rcWindow.right - te.Data.rcWindow.left);
	item.setAttribute("Height", te.Data.rcWindow.bottom - te.Data.rcWindow.top);
	item.setAttribute("CmdShow", api.IsZoomed(te.hwnd) ? SW_SHOWMAXIMIZED : te.CmdShow);
	item.setAttribute("DPI", screen.deviceYDPI);
	item.setAttribute("Installed", te.Data.Installed);
	root.appendChild(item);

	const TC = te.Ctrl(CTRL_TC);
	const cTC = te.Ctrls(CTRL_TC);
	for (let i in cTC) {
		if (cTC[i].Id != TC.Id) {
			SaveXmlTC(cTC[i], xml);
		}
	}
	SaveXmlTC(TC, xml);

	MainWindow.RunEvent1("SaveWindow", xml);
	try {
		xml.save(ExtractPath(te, filename));
	} catch (e) {
		if (e.number != E_ACCESSDENIED) {
			ShowError(e, [GetText("Save"), filename].join(": "));
		}
	}
}

ShowOptions = function (s) {
	try {
		const dlg = g_.dlgs.Options;
		if (dlg) {
			dlg.Document.parentWindow.SetTab(s);
			dlg.Focus();
			return;
		}
	} catch (e) { }
	const opt = api.CreateObject("Object");
	opt.width = te.Data.Conf_OptWidth;
	opt.height = te.Data.Conf_OptHeight;
	opt.Data = s;
	opt.event = api.CreateObject("Object");
	g_.dlgs.Options = ShowDialog("options.html", opt);
}

GetAddons = function () {
	ShowOptions("Tab=Get Addons");
}

GetIconPacks = function () {
	ShowOptions("Tab=Get Icons");
}

CheckUpdate = function (arg) {
	OpenHttpRequest("https://api.github.com/repos/tablacus/TablacusExplorer/releases/latest", "http://tablacus.github.io/TablacusExplorerAddons/te/releases.json", "CheckUpdate2", arg);
}

ShowAbout = function () {
	var opt = api.CreateObject("Object");
	opt.MainWindow = MainWindow;
	opt.Query = "about";
	opt.Modal = false;
	opt.width = 640;
	opt.height = 360;
	ShowDialog(BuildPath(te.Data.Installed, "script\\dialog.html"), opt);
}

ApiStruct = function (oTypedef, nAli, oMemory) {
	this.Size = 0;
	this.Typedef = oTypedef;
	for (let i in oTypedef) {
		const ar = oTypedef[i];
		const n = ar[1];
		this.Size += (n - (this.Size % n)) % n;
		ar[3] = this.Size;
		this.Size += n * (ar[2] || 1);
	}
	const n = GetNum(nAli);
	this.Size += (n - (this.Size % n)) % n;
	this.Memory = "object" === typeof oMemory ? oMemory : api.Memory("BYTE", this.Size);
	this.Read = function (Id) {
		const ar = this.Typedef[Id];
		if (ar) {
			return this.Memory.Read(ar[3], ar[0]);
		}
	};
	this.Write = function (Id, Data) {
		const ar = this.Typedef[Id];
		if (ar) {
			this.Memory.Write(ar[3], ar[0], Data);
		}
	};
}

AddEvent("ConfigChanged", function (s) {
	te.Data["bSave" + s] = true;
});

ExecAddonScript = function (type, s, fn, arError, o, arStack) {
	if (o === true) {
		o = api.CreateObject("Object");
		o.window = $;
	}
	const sc = api.GetScriptDispatch(s, type, o,
		function (ei, SourceLineText, dwSourceContext, lLineNumber, CharacterPosition) {
			arError.push([api.SysAllocString(ei.bstrDescription), fn, api.sprintf(16, "Line: %d", lLineNumber)].join("\n"));
		}
	);
	if (sc && arStack) {
		arStack.push(sc);
	}
	return sc;
}

AddonBeforeRemove = function (Id) {
	CollectGarbage();
	const arError = [];
	const r = LoadAddon("remove.js", Id, arError);
	if (arError.length) {
		MessageBox(arError.join("\n\n"), TITLE, MB_ICONSTOP |MB_OK);
	}
	return r;
}

CreateJScript = function (s) {
	return new AsyncFunction(s);
}

ShowError = function (e, s, i) {
	const sl = (s || "").toLowerCase();
	if (isFinite(i)) {
		const ea = (eventTA[sl] || {})[i];
		if (ea) {
			s = ea + " : " + s;
		}
	}
	if (g_.ShowError) {
		g_.ShowError = true;
		setTimeout(function (e, s) {
			g_.ShowError = MessageBox([e.stack || e.message , s, AboutTE(3)].join("\n\n"), TITLE, MB_OKCANCEL) != IDOK;
		}, 99, e, s)
	}
}

OpenXml = function (strFile, bAppData, bEmpty, strInit) {
	const xml = api.CreateObject("Msxml2.DOMDocument");
	xml.async = false;
	let path = BuildPath(te.Data.DataFolder, "config\\" + strFile);
	if (fso.FileExists(path) && xml.load(path)) {
		return xml;
	}
	if (!bAppData) {
		path = BuildPath(te.Data.Installed, "config\\" + strFile);
		if (fso.FileExists(path) && xml.load(path)) {
			api.SHFileOperation(FO_MOVE, path, BuildPath(te.Data.DataFolder, "config"), FOF_SILENT | FOF_NOCONFIRMATION, false);
			return xml;
		}
	}
	if (strInit) {
		path = BuildPath(strInit, strFile);
		if (fso.FileExists(path) && xml.load(path)) {
			return xml;
		}
	}
	path = BuildPath(te.Data.Installed, "init\\" + strFile);
	if (fso.FileExists(path) && xml.load(path)) {
		return xml;
	}
	return bEmpty ? xml : null;
}

LoadLang2 = function (filename) {
	filename = OrganizePath(filename, te.Data.Installed);
	var xml = api.CreateObject("Msxml2.DOMDocument");
	xml.async = false;
	if (!fso.FileExists(filename)) {
		if (/_\w+\.xml$/.test(filename)) {
			filename = filename.replace(/_\w+\.xml$/, ".xml");
			if (!fso.FileExists(filename)) {
				return;
			}
		} else {
			return;
		}
	}
	xml.load(filename);
	var items = xml.getElementsByTagName('text');
	for (var i = 0; i < api.ObjGetI(items, "length"); ++i) {
		var item = items[i];
		SetLang2(item.getAttribute("s").replace("\\t", "\t").replace("\\n", "\n"), item.text.replace("\\t", "\t").replace("\\n", "\n"));
	}
}

LoadLang = function (bAppend) {
	if (!bAppend) {
		MainWindow.Lang = api.CreateObject("Object");
		MainWindow.LangSrc = api.CreateObject("Object");
	}
	LoadLang2(BuildPath(te.Data.Installed, "lang", GetLangId() + ".xml"));
}

CreateFont = function (LogFont) {
	var key = [LogFont.lfFaceName, LogFont.lfHeight, LogFont.lfCharSet, LogFont.lfWeight, LogFont.lfItalic, LogFont.lfUnderline].join("\t");
	var hFont = te.Data.Fonts[key];
	if (!hFont) {
		hFont = api.CreateFontIndirect(LogFont);
		te.Data.Fonts[key] = hFont;
	}
	return hFont;
}

GetSavePath = function (FolderItem) {
	var path = api.GetDisplayNameOf(FolderItem, SHGDN_FORPARSING | SHGDN_FORPARSINGEX);
	var res = IsSearchPath(FolderItem);
	if (res) {
		return res[0];
	}
	if (/\?/.test(path)) {
		var nCount = api.ILGetCount(FolderItem);
		path = [];
		while (nCount-- > 0) {
			path.unshift(api.GetDisplayNameOf(FolderItem, (nCount > 0 ? SHGDN_FORADDRESSBAR : 0) | SHGDN_FORPARSING | SHGDN_INFOLDER | SHGDN_ORIGINAL));
			FolderItem = api.ILRemoveLastID(FolderItem);
		}
		return path.join("\\")
	}
	return path;
}

RemoveCommand = function (hMenu, ContextMenu, strDelete) {
	if (ContextMenu) {
		var mii = api.Memory("MENUITEMINFO");
		mii.cbSize = mii.Size;
		mii.fMask = MIIM_ID;
		for (var i = api.GetMenuItemCount(hMenu); i-- > 0;) {
			if (api.GetMenuItemInfo(hMenu, i, true, mii)) {
				if (api.PathMatchSpec(ContextMenu.GetCommandString(mii.wID - ContextMenu.idCmdFirst, GCS_VERB), strDelete)) {
					api.DeleteMenu(hMenu, i, MF_BYPOSITION);
				}
			}
		}
	}
}

DeleteTempFolder = function () {
	DeleteItem(te.Data.TempFolder);
}

PerformUpdate = function () {
	const oExec = wsh.Exec(g_.strUpdate);
	wsh.AppActivate(oExec.ProcessID);
}

OpenContains = function (Ctrl, pt) {
	var Items = GetSelectedItems(Ctrl, pt);
	for (var j = 0; j < Items.Count; ++j) {
		var Item = Items.Item(j);
		var path = Item.Path;
		Navigate(GetParentFolderName(path), SBSP_NEWBROWSER);
		SelectItem(te.Ctrl(CTRL_FV), path, SVSI_SELECT | SVSI_FOCUSED | SVSI_ENSUREVISIBLE | SVSI_NOTAKEFOCUS, 99);
	}
}

WmiProcess = function (arg, fn) {
	try {
		var server = te.GetObject("winmgmts:\\\\.\\root\\cimv2");
		if (server) {
			var cols = server.ExecQuery("SELECT * FROM Win32_Process " + arg);
			for (var list = api.CreateObject("Enum", cols); !list.atEnd(); list.moveNext()) {
				fn(list.item());
			}
		}
	} catch (e) { }
}

AddFavoriteEx = function (Ctrl, pt) {
	GetFolderView(Ctrl, pt).Focus();
	AddFavorite();
	return S_OK
}

SameFolderItems = function (Items1, Items2) {
	var i = Items1.Count;
	if (i != Items2.Count) {
		return false;
	}
	while (i-- > 0) {
		if (!api.ILIsEqual(Items1.Item(i), Items2.Item(i))) {
			return false;
		}
	}
	return true;
}

GetSelectedItems = function (Ctrl, pt) {
	var FV = GetFolderView(Ctrl, pt);
	if (FV) {
		return FV.SelectedItems();
	}
}

GetThumbnail = function (image, m, f) {
	var w = image.GetWidth(), h = image.GetHeight(), z = m / Math.max(w, h);
	if (z == 1 || (f && z > 1)) {
		return image;
	}
	return image.GetThumbnailImage(w * z, h * z);
}

ColumnsReplace = function (Ctrl, pid, fmt, fn, priority) {
	if (!Ctrl.ColumnsReplace) {
		try {
			Ctrl.ColumnsReplace = api.CreateObject("Object");
		} catch (e) {
			return;
		}
		if (!Ctrl.ColumnsReplace) {
			return;
		}
	}
	const n = api.PSGetDisplayName(pid);
	fn.fmt = fmt;
	if (Ctrl.ColumnsReplace[n] && priority != 2) {
		if (Ctrl.ColumnsReplace[n] === fn) {
			return;
		}
		if (!Ctrl.ColumnsReplace[n].push) {
			Ctrl.ColumnsReplace[n] = [Ctrl.ColumnsReplace[n]];
			Ctrl.ColumnsReplace[n].fmt = Ctrl.ColumnsReplace[n][0].fmt;
		}
		for (var i = Ctrl.ColumnsReplace[n]; i--;) {
			if (Ctrl.ColumnsReplace[n][i] === fn) {
				return;
			}
		}
		if (priority) {
			Ctrl.ColumnsReplace[n].push(fn);
		} else {
			Ctrl.ColumnsReplace[n].unshift(fn);
		}
	} else {
		Ctrl.ColumnsReplace[n] = fn;
	}
}

CustomSort = function (FV, id, r, fnAdd, fnComp) {
	var Progress = api.CreateObject("ProgressDialog");
	Progress.StartProgressDialog(te.hwnd, null, 2);
	var Name = api.PSGetDisplayName(id) || id;
	Progress.SetLine(1, api.LoadString(hShell32, 13585) || api.LoadString(hShell32, 6478), true);
	FV.Parent.LockUpdate();
	try {
		var Items = FV.Items();
		var List = [];
		for (var i = Items.Count; i--;) {
			List.push([i, fnAdd(Items.Item(i), FV)]);
		}
		List.sort(fnComp);
		if (r) {
			List = List.reverse();
		}
		var ViewMode = api.SendMessage(FV.hwndList, LVM_GETVIEW, 0, 0);
		if (ViewMode == 1 || ViewMode == 3) {
			api.SendMessage(FV.hwndList, LVM_SETVIEW, 4, 0);
		}
		var FolderFlags = FV.FolderFlags;
		FV.FolderFlags = FolderFlags | FWF_AUTOARRANGE;
		FV.GroupBy = "System.Null";
		var pt = api.Memory("POINT");
		FV.GetItemPosition(Items.Item(0), pt);
		var nMax = List.length;
		var p = nMax / 100;
		Progress.SetLine(1, api.LoadString(hShell32, 50690) + Name, true);
		for (var i = 0; i < nMax && !Progress.HasUserCancelled(); ++i) {
			Progress.SetTitle((i / p).toFixed(0) + "%");
			Progress.SetProgress(i, nMax);
			FV.SelectAndPositionItem(Items.Item(List[i][0]), 0, pt);
		}
		api.SendMessage(FV.hwndList, LVM_SETVIEW, ViewMode, 0);
		FV.FolderFlags = FolderFlags;
		var hHeader = api.SendMessage(FV.hwndList, LVM_GETHEADER, 0, 0);
		var item = api.Memory("HDITEM");
		item.mask = HDI_TEXT | HDI_FORMAT;
		item.pszText = api.Memory("WCHAR", 260);
		item.cchTextMax = 260;
		if (id) {
			for (var i = api.SendMessage(hHeader, HDM_GETITEMCOUNT, 0, 0); i-- > 0;) {
				api.SendMessage(hHeader, HDM_GETITEM, i, item);
				if (Name == api.SysAllocString(item.pszText)) {
					item.mask = HDI_FORMAT;
					item.fmt |= r ? HDF_SORTDOWN : HDF_SORTUP;
					api.SendMessage(hHeader, HDM_SETITEM, i, item);
					break;
				}
			}
		}
	} catch (e) { }
	FV.Parent.UnlockUpdate(true);
	Progress.StopProgressDialog();
}

MakeCommDlgFilter = function (arg) {
	var ar = arg ? arg.join ? arg : [arg] : [];
	var result = [];
	var bAll = true;
	for (var i = 0; i < ar.length; ++i) {
		var s = ar[i];
		bAll &= s.indexOf("*.*") < 0;
		if (/[\|#]/.test(s)) {
			result.push(s.replace(/[#\@]/g, "|").replace(/[\0\|]$/, ""));
			continue;
		}
		var res = /\(([^\)]+)\)/.exec(s);
		if (res) {
			result.push(s, res[1]);
			continue;
		}
		var sfi = api.Memory("SHFILEINFO");
		api.SHGetFileInfo(s, 0, sfi, sfi.Size, SHGFI_TYPENAME | SHGFI_USEFILEATTRIBUTES);
		result.push(sfi.szTypeName + " (" + s + ")", s);
	}
	if (bAll) {
		result.push(api.LoadString(hShell32, 34193) || "All files", "*.*");
	}
	return result.join("|");
}

GetHICON = function (iIcon, h, flags) {
	var ar = [SHIL_JUMBO, SHIL_EXTRALARGE, SHIL_LARGE, SHIL_SMALL]
	for (var i = ar.length; h > te.Data.SHILS[ar[--i]].cy && i;) { }
	return api.ImageList_GetIcon(te.Data.SHIL[ar[i]], iIcon, flags);
}

ExtractFilter = function (s) {
	return (ExtractMacro(te, s) || "").replace(/[\r\n;]+/g, ";").replace(/^;+|;+$|"/g, "");
}

GetEnum = function (FolderItem, bShowHidden) {
	if (FolderItem.Enum) {
		return FolderItem.Enum(FolderItem);
	}
	if (FolderItem.IsFolder) {
		var Folder = FolderItem.GetFolder;
		if (Folder) {
			var Items = Folder.Items();
			if (bShowHidden || api.GetKeyState(VK_SHIFT) < 0) {
				try {
					Items.Filter(SHCONTF_FOLDERS | SHCONTF_NONFOLDERS | SHCONTF_INCLUDEHIDDEN, "*");
				} catch (e) { }
			}
			return api.CreateObject("FolderItems", Items);
		}
	}
}

MakeImgDataEx = function (src, bSimple, h) {
	return bSimple || REGEXP_IMAGE.test(src) ? src : MakeImgSrc(src, 0, false, h);
}

MakeImgSrc = function (src, index, bSrc, h) {
	var fn;
	src = ExtractPath(te, src);
	if (!/^file:/i.test(src) && REGEXP_IMAGE.test(src)) {
		return src;
	}
	var res = /^icon:(.+)/i.exec(src);
	if (res) {
		var icon = res[1].split(",");
		if (!/\\/.test(icon[0])) {
			fn = BuildPath(te.Data.DataFolder, ["icons", icon[0].replace(/\..*/, ""), icon[1] + ".png"].join("\\"));
			if (fso.FileExists(fn)) {
				return fn;
			}
		}
	}
	if (g_.IEVer < 8) {
		res = /^bitmap:(.+)/i.exec(src);
		if (res) {
			fn = BuildPath(te.Data.DataFolder, "cache\\bitmap\\" + res[1].replace(/[:\\\/]/g, "$") + ".png");
		} else {
			res = /^icon:(.+)/i.exec(src);
			if (res) {
				fn = BuildPath(te.Data.DataFolder, "cache\\icon\\" + (res[1].replace(/[:\\\/]/g, "$")) + ".png");
			} else if (src && !REGEXP_IMAGE.test(src)) {
				fn = BuildPath(te.Data.DataFolder, "cache\\file\\" + (api.PathCreateFromUrl(src).replace(/[:\\\/]/g, "$")) + ".png");
			}
		}
		if (fn && fso.FileExists(fn)) {
			return fn;
		}
	}
	var image = MakeImgData(src, index, h);
	if (image) {
		if (g_.IEVer >= 8) {
			return image.DataURI("image/png");
		}
		if (fn) {
			image.Save(fn);
			return fn;
		}
	}
	return bSrc ? src : "";
}

MakeImgData = function (src, index, h) {
	var hIcon = MakeImgIcon(src, index, h);
	if (hIcon) {
		var image = api.CreateObject("WICBitmap").FromHICON(hIcon);
		api.DestroyIcon(hIcon);
		return image;
	}
}

MakeImgIcon = function (src, index, h, bIcon) {
	let hIcon = null;
	let res = /^bitmap:(.+)/i.exec(src);
	if (res) {
		const icon = res[1].split(",");
		const ar = [
			["bitmap:ieframe.dll,206,16,", "bitmap:ExplorerFrame.dll,264,16,", 16, "browser"],
			["bitmap:ieframe.dll,204,24,", "bitmap:ExplorerFrame.dll,264,16,", 16, "browser"],
			["bitmap:ieframe.dll,216,16,", "bitmap:comctl32.dll,130,16,", 16, "general"],
			["bitmap:ieframe.dll,214,24,", "bitmap:comctl32.dll,131,24,", 24, "general"]
		];
		for (let i in ar) {
			const a2 = ar[i];
			if (api.StrCmpNI(src, a2[0], a2[0].length) == 0) {
				const a3 = src.split(",");
				const path = BuildPath(te.Data.DataFolder, ["icons", a2[3], a3[3] + ".png"].join("\\"));
				let image = api.CreateObject("WICBitmap").FromFile(path);
				if (image) {
					image = GetThumbnail(image, a3[2], true);
					return image.GetHICON();
				}
			}
		}
		const hModule = LoadImgDll(icon, index);
		if (hModule) {
			const himl = api.ImageList_LoadImage(hModule, isFinite(icon[index * 4 + 1]) ? Number(icon[index * 4 + 1]) : icon[index * 4 + 1], icon[index * 4 + 2], CLR_NONE, CLR_NONE, IMAGE_BITMAP, LR_CREATEDIBSECTION | LR_LOADTRANSPARENT);
			if (himl) {
				hIcon = api.ImageList_GetIcon(himl, icon[index * 4 + 3], ILD_NORMAL);
				api.ImageList_Destroy(himl);
			} else if (SameText(icon[index * 4], "ieframe.dll")) {
				for (var i in ar) {
					var a2 = ar[i];
					if (api.StrCmpNI(src, a2[0], a2[0].length) == 0) {
						src = src.replace(a2[0], a2[1]);
						if (i > 1) {
							var a3 = src.split(",");
							if (a3[3] == 43) {
								a3[3] = 4;
							} else if (a3[3] > 19) {
								a3[1] -= 6;
								a3[3] -= 20;
							} else if (a3[3] > 4) {
								a3[1] -= 10;
								a3[3] -= 5;
							}
							src = a3.join(",");
						}
						hIcon = MakeImgIcon(src, index, a2[2], bIcon);
						break;
					}
				}
			}
			api.FreeLibrary(hModule);
			return hIcon;
		}
	}
	res = /^icon:(.+)/i.exec(src);
	if (res) {
		const icon = res[1].split(",");
		if (!/\\/.test(icon[0])) {
			const path = BuildPath(te.Data.DataFolder, ["icons", icon[0].replace(/\..*/, ""), icon[1] + ".png"].join("\\"));
			const image = api.CreateObject("WICBitmap").FromFile(path);
			if (image) {
				return image.GetHICON();
			}
		}
		if (SameText(icon[0], "shell32.dll")) {
			const dw = { 3: SHGFI_SYSICONINDEX | SHGFI_USEFILEATTRIBUTES, 4: SHGFI_SYSICONINDEX | SHGFI_OPENICON | SHGFI_USEFILEATTRIBUTES }[res[1]];
			if (dw) {
				const sfi = api.Memory("SHFILEINFO");
				api.SHGetFileInfo("*", FILE_ATTRIBUTE_DIRECTORY, sfi, sfi.Size, dw);
				return GetHICON(sfi.iIcon, h, ILD_NORMAL);
			}
		}
		const phIcon = api.Memory("HANDLE");
		if (icon[index * 4 + 2]) {
			h = icon[index * 4 + 2];
		} else if (!h) {
			h = api.GetSystemMetrics(SM_CYSMICON);
		}
		if (h > 16) {
			api.SHDefExtractIcon(icon[index * 4], icon[index * 4 + 1], 0, phIcon, null, h);
		} else {
			api.SHDefExtractIcon(icon[index * 4], icon[index * 4 + 1], 0, null, phIcon, h << 16);
		}
		if (phIcon[0]) {
			return phIcon[0];
		}
	}
	if (src && (bIcon || /\*/.test(src) || !REGEXP_IMAGE.test(src))) {
		const sfi = api.Memory("SHFILEINFO");
		if (/\*/.test(src)) {
			api.SHGetFileInfo(src, 0, sfi, sfi.Size, SHGFI_SYSICONINDEX | SHGFI_USEFILEATTRIBUTES);
		} else {
			if (/^file:/i.test(src)) {
				src = api.PathCreateFromUrl(src) || src;
			}
			const pidl = api.ILCreateFromPath(PathUnquoteSpaces(src));
			if (pidl) {
				api.SHGetFileInfo(pidl, 0, sfi, sfi.Size, SHGFI_SYSICONINDEX | SHGFI_PIDL);
			}
		}
		return GetHICON(sfi.iIcon, h, ILD_NORMAL);
	}
}

GetKeyKey = function (strKey) {
	var nShift = api.sscanf(strKey, "$%x");
	if (nShift) {
		return nShift;
	}
	strKey = strKey.toUpperCase();
	for (var j = 0; j < MainWindow.g_.KeyState.length; ++j) {
		var s = MainWindow.g_.KeyState[j][0].toUpperCase() + "+";
		var i = strKey.indexOf(s);
		if (i >= 0) {
			strKey = strKey.slice(0, i) + strKey.slice(i + s.length);
			nShift |= MainWindow.g_.KeyState[j][1];
		}
	}
	return nShift | MainWindow.g_.KeyCode[strKey];
}

GetKeyName = function (strKey, bEn) {
	var nKey = api.sscanf(strKey, "$%x");
	if (nKey) {
		var s = api.GetKeyNameText((nKey & 0x17f) << 16);
		if (s) {
			var arKey = [];
			for (var i = 0, z = MainWindow.g_.KeyState.length; i < z; ++i) {
				var j = bEn ? (i + 3) % z : i;
				if (nKey & MainWindow.g_.KeyState[j][1]) {
					nKey -= MainWindow.g_.KeyState[j][1];
					arKey.push(MainWindow.g_.KeyState[j][0]);
				}
			}
			if (GetKeyKey(s) == nKey) {
				arKey.push(s);
				return arKey.join("+");
			}
		}
	}
	return strKey;
}

GetKeyShift = function () {
	var nShift = 0;
	var n = 0x1000;
	var vka = [VK_SHIFT, VK_CONTROL, VK_MENU, VK_LWIN];
	for (var i in vka) {
		if (api.GetKeyState(vka[i]) < 0) {
			nShift += n;
		}
		n *= 2;
	}
	return nShift;
}

SetKeyData = function (mode, strKey, path, type, km, o) {
	var s = "";
	if (!o) {
		o = te.Data;
		s = km;
	}
	if (km == "Key") {
		o[s + mode][GetKeyKey(strKey)] = [path, type];
	} else {
		o[s + mode][strKey] = [path, type];
	}
}

SendShortcutKeyFV = function (Key) {
	var FV = te.Ctrl(CTRL_FV);
	if (FV) {
		var KeyState = api.Memory("KEYSTATE");
		api.GetKeyboardState(KeyState);
		var KeyCtrl = KeyState.Read(VK_CONTROL, VT_UI1);
		KeyState.Write(VK_CONTROL, VT_UI1, 0x80);
		api.SetKeyboardState(KeyState);
		FV.TranslateAccelerator(0, WM_KEYDOWN, Key.charCodeAt(0), 0);
		FV.TranslateAccelerator(0, WM_KEYUP, Key.charCodeAt(0), 0);
		KeyState.Write(VK_CONTROL, VT_UI1, KeyCtrl);
		api.SetKeyboardState(KeyState);
	}
}

Navigate = function (Path, wFlags) {
	NavigateFV(te.Ctrl(CTRL_FV), Path, wFlags);
}

NavigateFV = function (FV, Path, wFlags, bInputed) {
	if (!FV) {
		var TC = te.CreateCtrl(CTRL_TC, 0, 0, "100%", "100%", te.Data.Tab_Style, te.Data.Tab_Align, te.Data.Tab_TabWidth, te.Data.Tab_TabHeight);
		FV = TC.Selected;
	}
	if ("string" === typeof Path) {
		Path = ExtractMacro(FV, Path).replace(/^\s+|\s*$/g, "");
		if (/\?|\*/.test(Path)) {
			if (!/\\\\\?\\|:/.test(Path)) {
				FV.FilterView = Path;
				FV.Refresh();
				return;
			}
		}
		if (/^file:/.test(Path)) {
			Path = decodeURI(Path);
		}
	}
	if (wFlags == null) {
		wFlags = GetOpenMode(FV);
	}
	if (GetLock(FV)) {
		wFlags |= SBSP_NEWBROWSER;
	}
	if (bInputed) {
		RunEvent1("LocationEntered", FV, Path, wFlags);
		var r = MainWindow.RunEvent4("LocationEntered2", FV, Path, wFlags);
		if (r !== void 0) {
			return r;
		}
	}
	FV.Navigate(Path, wFlags);
	FV.Focus();
}

GetOpenMode = function (FV) {
	return MainWindow.g_menu_button == 3 ? SBSP_NEWBROWSER : GetNavigateFlags(FV);
}

IsDrag = function (pt1, pt2) {
	if (pt1 && pt2) {
		try {
			return (Math.abs(pt1.x - pt2.x) > api.GetSystemMetrics(SM_CXDRAG) || Math.abs(pt1.y - pt2.y) > api.GetSystemMetrics(SM_CYDRAG));
		} catch (e) { }
	}
	return false;
}

ChangeTab = function (TC, nMove) {
	const nCount = TC.Count;
	TC.SelectedIndex = (TC.SelectedIndex + nCount + nMove) % nCount;
}

LoadLayout = function () {
	const commdlg = api.CreateObject("CommonDialog");
	commdlg.InitDir = BuildPath(te.Data.DataFolder, "layout");
	commdlg.Filter = MakeCommDlgFilter("*.xml");
	commdlg.Flags = OFN_FILEMUSTEXIST;
	if (commdlg.ShowOpen()) {
		LoadXml(commdlg.FileName);
	}
	return S_OK;
}

SaveLayout = function () {
	const commdlg = api.CreateObject("CommonDialog");
	commdlg.InitDir = BuildPath(te.Data.DataFolder, "layout");
	commdlg.Filter = MakeCommDlgFilter("*.xml");
	commdlg.DefExt = "xml";
	commdlg.Flags = OFN_OVERWRITEPROMPT;
	if (commdlg.ShowSave()) {
		SaveXml(commdlg.FileName);
	}
	return S_OK;
}

PtInRect = function (rc, pt) {
	if (rc) {
		return pt.x >= rc.left && pt.x < rc.right && pt.y >= rc.top && pt.y < rc.bottom;
	}
}

IsExists = function (path) {
	const wfd = api.Memory("WIN32_FIND_DATA");
	const hFind = api.FindFirstFile(path.replace(/\\$/, ""), wfd);
	api.FindClose(hFind);
	return hFind != INVALID_HANDLE_VALUE;
}

GetNonExistent = function (path) {
	let paths = api.CreateObject("Array");
	if (/^[A-Z]:\\|^\\\\\w/i.test(path)) {
		paths[0] = path;
		paths[1] = "";
		while (paths[0] && !fso.FolderExists(paths[0])) {
			paths[1] = BuildPath(GetFileName(paths[0]), paths[1]);
			paths[0] = GetParentFolderName(paths[0]);
		}
	}
	return paths;
}

CreateFolders = function (paths) {
	if ("string" === typeof paths) {
		paths = GetNonExistent(paths);
	}
	const ar = paths[1].split("\\");
	if (ar[0]) {
		let path = paths[0];
		try {
			for (let i = 0; i < ar.length; ++i) {
				path = BuildPath(path, ar[i]);
				fso.CreateFolder(path);
			}
		} catch (e) {
			return E_FAIL;
		}
	}
}

CreateNew = function (path, fn) {
	if (fn && !IsExists(path)) {
		let paths;
		try {
			paths = GetNonExistent(GetParentFolderName(path));
			if (paths[1]) {
				if (CreateFolders(paths) < 0) {
					throw 1;
				}
			}
			fn(path);
		} catch (e) {
			paths = GetNonExistent(path);
			const ar = paths[1].split("\\");
			const path2 = BuildPath(te.Data.TempFolder, ar[0]);
			const path3 = BuildPath(te.Data.TempFolder, paths[1]);
			DeleteItem(path2);
			CreateFolders(path3);
			fn(BuildPath(path3, GetFileName(path)));
			api.SHFileOperation(FO_MOVE, path2, GetParentFolderName(BuildPath(paths[0], ar[0])), FOF_SILENT | FOF_NOCONFIRMATION, false);
		}
	}
	MainWindow.g_.NewItemTime = new Date().getTime() + 5000;
	MainWindow.SelectItem(te.Ctrl(CTRL_FV), path, SVSI_FOCUSED | SVSI_ENSUREVISIBLE | SVSI_DESELECTOTHERS | SVSI_SELECTIONMARK | SVSI_SELECT, 800);
}

SetFileTime = function (path, ctime, atime, mtime) {
	const b = MainWindow.RunEvent3("SetFileTime", path, ctime, atime, mtime);
	if (isFinite(b)) {
		return b;
	}
	return api.SetFileTime(path, ctime, atime, mtime);
}

SetFileAttributes = function (path, attr) {
	const b = MainWindow.RunEvent3("SetFileAttributes", path, attr);
	if (isFinite(b)) {
		return b;
	}
	try {
		fso.GetFile(path).Attributes = attr;
	} catch (e) {
		try {
			fso.GetFolder(path).Attributes = attr;
		} catch (e) {
			return false;
		}
	}
	return true;
}

CreateFolder = function (path) {
	path = path.replace(/^\s*|\\$/g, "");
	const r = MainWindow.RunEvent4("CreateFolder", path);
	if (r != null) {
		return r;
	}
	CreateNew(path, function (strPath) {
		fso.CreateFolder(strPath);
	});
}

CreateFile = function (path) {
	path = path.replace(/^\s*|\\$/g, "");
	const r = MainWindow.RunEvent4("CreateFile", path);
	if (r != null) {
		return r;
	}
	CreateNew(path, CreateFile2);
}

CreateFolder2 = function (path) {
	if (!fso.FolderExists(path)) {
		CreateFolder(path);
	}
}

CreateFile2 = function (path) {
	let ext = fso.GetExtensionName(path);
	if (ext) {
		let s, r = "HKCR\\." + ext + "\\";
		try {
			s = wsh.regRead(r);
			try {
				wsh.RegRead(r + "ShellNew\\");
			} catch (e) {
				r += s + "\\";
				wsh.RegRead(r + "\\ShellNew\\");
			}
			r += "ShellNew\\";
			const ar = ['Command', 'Data', 'FileName'];
			for (let i in ar) {
				try {
					s = wsh.RegRead(r + ar[i]);
				} catch (e) {
					continue;
				}
				if (s) {
					if (i == 2) {
						r = BuildPath(wsh.SpecialFolders("Templates"), s);
						if (!fso.FileExists(r)) {
							r = wsh.ExpandEnvironmentStrings("%SystemRoot%\\ShellNew\\") + s;
						}
						fso.CopyFile(r, path);
						SetFileTime(path, null, null, new Date());
						return;
					}
					if (i == 1) {
						const a = fso.CreateTextFile(path);
						a.Write(s);
						a.Close();
						return;
					}
					ShellExecute(s.replace("%1", path), null, SW_SHOWNORMAL);
					return;
				}
			}
		} catch (e) { }
	}
	fso.CreateTextFile(path).Close();
}

FormatDateTime = function (s) {
	return new Date(s).getTime() > 0 ? (api.GetDateFormat(LOCALE_USER_DEFAULT, 0, s, api.GetLocaleInfo(LOCALE_USER_DEFAULT, LOCALE_SSHORTDATE)) + " " + api.GetTimeFormat(LOCALE_USER_DEFAULT, 0, s, api.GetLocaleInfo(LOCALE_USER_DEFAULT, LOCALE_STIMEFORMAT))) : "";
};

Navigate2 = function (path, NewTab) {
	const a = path.toString().split("\n");
	for (let i in a) {
		const s = a[i].replace(/^\s+/, "");
		if (s != "") {
			Navigate(s, NewTab);
			NewTab |= SBSP_NEWBROWSER;
		}
	}
}

ExecOpen = function (Ctrl, s, type, hwnd, pt, NewTab) {
	let nLock = 0;
	const line = s.split("\n");
	const bRev = (NewTab & SBSP_ACTIVATE_NOFOCUS);
	const FV = GetFolderView(Ctrl, pt);
	if (line.length > 1) {
		++g_.LockUpdate;
		++nLock;
		te.LockUpdate();
		if (api.ILIsEqual(FV, "about:blank")) {
			if (bRev) {
				line.push(line.shift());
			}
		}
	}
	try {
		while (line.length) {
			if (s = bRev ? line.pop() : line.shift()) {
				NavigateFV(FV, ExtractPath(Ctrl, s, pt), NewTab);
				NewTab |= SBSP_NEWBROWSER;
			}
		}
	} catch (e) {
		ShowError(e);
	}
	if (nLock) {
		g_.LockUpdate -= nLock;
		te.UnlockUpdate();
	}
	return S_OK;
}

DropOpen = function (Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop) {
	var line = s.split("\n");
	var hr = E_FAIL;
	var path = ExtractPath(Ctrl, line[0], pt);
	if (!api.ILIsEqual(dataObj.Item(-1), path)) {
		var DropTarget = api.DropTarget(path);
		if (DropTarget) {
			if (!pdwEffect) {
				pdwEffect = dataObj.pdwEffect;
			}
			pdwEffect[0] = DROPEFFECT_COPY | DROPEFFECT_MOVE | DROPEFFECT_LINK;
			hr = bDrop ? DropTarget.Drop(dataObj, grfKeyState, pt, pdwEffect) : DropTarget.DragOver(dataObj, grfKeyState, pt, pdwEffect);
		}
	}
	return hr;
}

Exec = function (Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop) {
	if (!s || (dataObj && !dataObj.Count)) {
		if (pdwEffect) {
			pdwEffect[0] = DROPEFFECT_NONE;
		}
		return S_FALSE;
	}
	window.Ctrl = Ctrl;
	window.hwnd = hwnd;
	window.dataObj = dataObj;
	window.grfKeyState = grfKeyState;
	window.pdwEffect = pdwEffect;
	window.bDrop = bDrop;
	if (pt) {
		window.pt = pt;
		te.Data.pt = pt;
	} else {
		window.pt = te.Data.pt;
	}
	window.Handled = S_OK;
	window.FV = GetFolderView(Ctrl, pt);

	if (/^Func$|^Async$/i.test(type)) {
		const hr = api.Invoke(s, [Ctrl, pt, hwnd, dataObj, grfKeyState, pdwEffect, bDrop, window.FV]);
		return /^Func$/i.test(type) ? hr : S_OK;
	}
	const hr = MainWindow.RunEvent3("Exec", Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop, window.FV);
	return isFinite(hr) ? hr : window.Handled;
}

ExecScriptEx = function (Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop, FV) {
	var fn = null;
	try {
		if (/J.*Script/i.test(type)) {
			if (/^"?[A-Z]:\\.*\.js"?\s*$|^"?\\\\\w.*\.js"?s*$/im.test(s)) {
				s = ReadTextFile(s);
			}
			fn = { Handled: new AsyncFunction(s) };
		} else if (/VBScript/i.test(type)) {
			if (/^"?[A-Z]:\\.*\.vbs"?\s*$|^"?\\\\\w.*\.vbs"?s*$/im.test(s)) {
				s = ReadTextFile(s);
			}
			const o = api.CreateObject("Object");
			o.window = $;
			fn = api.GetScriptDispatch('Function Handled(Ctrl, pt, hwnd, dataObj, grfKeyState, pdwEffect, bDrop, FV)\n' + s + '\nEnd Function', type, o);
		}
		if (fn) {
			var r = fn.Handled(Ctrl, pt, hwnd, dataObj, grfKeyState, pdwEffect, bDrop, FV);
			return isFinite(r) ? r : window.Handled;
		}
		api.ExecScript(s, type, {
			window: window,
			Ctrl: Ctrl,
			pt: pt,
			hwnd: hwnd,
			dataObj: dataObj,
			grfKeyState: grfKeyState,
			pdwEffect: pdwEffect,
			bDrop: bDrop,
			FV: FV
		});
	} catch (e) {
		ShowError(e, s);
	}
	return window.Handled;
}

DropScript = function (Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop, FV) {
	if (!pdwEffect) {
		pdwEffect = api.Memory("DWORD");
	}
	if (/EnableDragDrop/.test(s)) {
		return ExecScriptEx(Ctrl, s, type, hwnd, pt, dataObj, grfKeyState, pdwEffect, bDrop, FV);
	}
	pdwEffect[0] = DROPEFFECT_NONE;
	return E_NOTIMPL;
}

ExtractPath = function (Ctrl, s, pt) {
	s = PathUnquoteSpaces(ExtractMacro(Ctrl, GetConsts(s)));
	if (/^\.|^\\$/.test(s)) {
		const FV = GetFolderView(Ctrl, pt);
		if (FV) {
			if (s == "\\") {
				return fso.GetDriveName(FV.FolderItem.Path) + s;
			}
			if (s == "..") {
				return api.GetDisplayNameOf(api.ILGetParent(FV), SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_ORIGINAL);
			}
			let res = /\.\.\\(.*)/.exec(s);
			if (res) {
				return BuildPath(api.GetDisplayNameOf(api.ILGetParent(FV), SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_ORIGINAL), res[1]);
			}
			res = /\.\\(.*)/.exec(s);
			if (res) {
				return BuildPath(api.GetDisplayNameOf(FV, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_ORIGINAL), res[1]);
			}
		}
	}
	return s;
}

PathMatchEx = function (path, s) {
	const hr = MainWindow.RunEvent3("PathMatch", path, s);
	if (isFinite(hr)) {
		return hr;
	}
	const res = /^\/(.*)\/(.*)/.exec(s);
	return res ? new RegExp(res[1], res[2]).test(path) : api.PathMatchSpec(path, s);
}

IsFolderEx = function (Item) {
	if (Item) {
		if (Item.IsFolder && !api.ILIsParent(ssfBITBUCKET, Item, true)) {
			var wfd = api.Memory("WIN32_FIND_DATA");
			var hr = api.SHGetDataFromIDList(Item, SHGDFIL_FINDDATA, wfd, wfd.Size);
			return (hr < 0) || (wfd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0 || !/^[A-Z]:\\|^\\\\\w.*\\.*\\/i.test(Item.Path);
		}
		return !Item.IsFileSystem && Item.IsBrowsable;
	}
	return false;
}

OpenMenu = function (items, SelItem) {
	let arMenu;
	let path = "";
	if (SelItem) {
		if ("object" === typeof SelItem) {
			let link = SelItem.ExtendedProperty("linktarget");
			path = String(api.GetDisplayNameOf(SelItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_FORPARSINGEX));
			if (link && /\.lnk$/i.test(path)) {
				for (let i = items.length; --i >= 0;) {
					const s = items[i].getAttribute("Filter");
					if (/\.lnk/i.test(s) && PathMatchEx(path, s)) {
						link = path;
						break;
					}
				}
				path = link;
			}
			arMenu = OpenMenu(items, path);
			if (!IsFolderEx(SelItem) && (!link || !api.PathIsDirectory(path))) {
				return arMenu;
			}
			path += ".folder";
		} else {
			path = SelItem;
		}
	}
	arMenu = [];
	const arLevel = [];
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		const strType = String(item.getAttribute("Type")).toLowerCase();
		const strFlag = strType == "menus" ? item.text.toLowerCase() : "";
		let bAdd = SelItem ? PathMatchEx(path, item.getAttribute("Filter")) : /^$|^\/\^\$\//.test(item.getAttribute("Filter"));
		if (strFlag == "close") {
			bAdd = arLevel.pop();
		}
		if (strFlag == "open") {
			arLevel.push(bAdd);
		}
		if (bAdd && (arLevel.length == 0 || arLevel[arLevel.length - 1])) {
			arMenu.push(i);
		}
	}
	return arMenu;
}

ExecMenu3 = function (Ctrl, Name, x, y) {
	window.Ctrl = Ctrl;
	setTimeout(function () {
		ExecMenu2(Name, x, y);
	}, 99);
}

ExecMenu2 = function (Name, x, y) {
	if (!pt) {
		pt = api.Memory("POINT");
	}
	pt.x = x;
	pt.y = y;
	ExecMenu(Ctrl, Name, pt, 0);
}

AdjustMenuBreak = function (hMenu) {
	var mii = api.Memory("MENUITEMINFO");
	mii.cbSize = mii.Size;
	var uFlags = 0;
	for (var i = api.GetMenuItemCount(hMenu); i-- > 0;) {
		mii.fMask = MIIM_FTYPE | MIIM_SUBMENU;
		api.GetMenuItemInfo(hMenu, i, true, mii);
		if (api.GetMenuString(hMenu, i, MF_BYPOSITION) != "") {
			mii.fType |= uFlags;
			api.SetMenuItemInfo(hMenu, i, true, mii);
			uFlags = 0;
			if (mii.hSubMenu) {
				AdjustMenuBreak(mii.hSubMenu);
			}
			continue;
		}
		if (mii.hSubMenu) {
			AdjustMenuBreak(mii.hSubMenu);
			continue;
		}
		var u = mii.fType & (MFT_MENUBREAK | MFT_MENUBARBREAK);
		if (u && api.DeleteMenu(hMenu, i, MF_BYPOSITION)) {
			++i;
			uFlags = u;
		} else {
			uFlags = 0;
		}
	}
	for (var i = api.GetMenuItemCount(hMenu); i--;) {
		mii.fMask = MIIM_FTYPE;
		api.GetMenuItemInfo(hMenu, i, true, mii);
		if ((mii.fType & MFT_SEPARATOR) || api.GetMenuString(hMenu, i, MF_BYPOSITION).charAt(0) == '{') {
			api.DeleteMenu(hMenu, i, MF_BYPOSITION);
			continue;
		}
		break;
	}
	uFlags = 0;
	for (var i = api.GetMenuItemCount(hMenu); i--;) {
		mii.fMask = MIIM_FTYPE;
		api.GetMenuItemInfo(hMenu, i, true, mii);
		if (uFlags & mii.fType & MFT_SEPARATOR) {
			api.DeleteMenu(hMenu, i, MF_BYPOSITION);
		}
		uFlags = mii.fType;
	}
}

teMenuGetElementsByTagName = function (Name) {
	let menus = te.Data.xmlMenus.getElementsByTagName(Name);
	if (!menus || !menus.length) {
		const altMenu = {
			"ViewContext": "Background",
			"Background": "ViewContext",
			"TaskTray": "Systray",
			"Systray": "TaskTray"
		}
		menus = te.Data.xmlMenus.getElementsByTagName(altMenu[Name]);
	}
	return menus;
}

ExecMenu = function (Ctrl, Name, pt, Mode, bNoExec, ContextMenu) {
	let items = null;
	const menus = teMenuGetElementsByTagName(Name);
	if (menus && menus.length) {
		items = menus[0].getElementsByTagName("Item");
	}
	let uCMF = Ctrl.Type != CTRL_TV ? CMF_NORMAL | CMF_CANRENAME : CMF_EXPLORE | CMF_CANRENAME;
	if (api.GetKeyState(VK_SHIFT) < 0) {
		uCMF |= CMF_EXTENDEDVERBS;
	}
	const ar = GetSelectedArray(Ctrl, pt);
	const Selected = ar.shift();
	const SelItem = ar.shift();
	const FV = ar.shift();
	ExtraMenuCommand = api.CreateObject("Object");
	ExtraMenuData = api.CreateObject("Object");
	eventTE.menucommand = api.CreateObject("Array");
	eventTA.menucommand = api.CreateObject("Array");
	let arMenu, item;
	if (items) {
		arMenu = OpenMenu(items, SelItem);
		for (let i = 0; i < arMenu.length; ++i) {
			item = items[arMenu[i]];
			if (!/^menus$/i.test(item.getAttribute("Type"))) {
				break;
			}
			item = null;
		}
		let nBase = GetNum(menus[0].getAttribute("Base"));
		if (nBase == 1) {
			if (GetNum(menus[0].getAttribute("Pos")) < 0) {
				for (let i = arMenu.length; i-- > 0;) {
					item = items[arMenu[i]];
					if (!/^menus$/i.test(item.getAttribute("Type"))) {
						break;
					}
					item = null;
				}
				if (arMenu.length > 1) {
					for (let i = arMenu.length; i--;) {
						let nLevel = 0;
						if (/^menus$/i.test(items[arMenu[i]].getAttribute("Type"))) {
							const s = String(items[arMenu[i]].text).toLowerCase();
							if (s == "close") {
								++nLevel;
							}
							if (s == "open") {
								if (--nLevel < 0) {
									arMenu.splice(0, i + 1);
									nBase = 0;
									break;
								}
							}
						}
					}
				}
			}
		}
		if (nBase != 1) {
			const hMenu = api.CreatePopupMenu();
			let arContextMenu;
			if (ContextMenu && nBase == 2) {
				arContextMenu = [void 0, ContextMenu];
			}
			ContextMenu = GetBaseMenuEx(hMenu, nBase, FV, Selected, uCMF, Mode, SelItem, arContextMenu);
			if (nBase < 5) {
				AdjustMenuBreak(hMenu);
			}
			g_nPos = MakeMenus(hMenu, menus, arMenu, items, Ctrl, pt, 0, null, true);
			const eo = eventTE[Name.toLowerCase()];
			for (let i in eo) {
				try {
					g_nPos = api.Invoke(eo[i], [Ctrl, hMenu, g_nPos, Selected, SelItem, ContextMenu, Name, pt]);
				} catch (e) {
					ShowError(e, Name, i);
				}
			}
			for (let i in eventTE.menus) {
				try {
					g_nPos = eventTE.menus[i](Ctrl, hMenu, g_nPos, Selected, SelItem, ContextMenu, Name, pt);
				} catch (e) {
					ShowError(e, "Menus", i);
				}
			}
			if (!pt) {
				pt = api.Memory("POINT");
				pt.x = -1;
				pt.y = -1;
			}
			if (pt.x == -1 && pt.y == -1) {
				switch (Ctrl.Type) {
					case CTRL_SB:
					case CTRL_EB:
					case CTRL_TV:
						const rc = api.Memory("RECT");
						if (Ctrl.GetItemRect(SelItem, rc) != S_OK) {
							api.GetClientRect(Ctrl.hwnd, rc);
						}
						api.GetCursorPos(pt);
						api.ScreenToClient(Ctrl.hwnd, pt);
						if (!PtInRect(rc, pt)) {
							pt.x = rc.left;
							pt.y = rc.top;
						}
						api.ClientToScreen(Ctrl.hwnd, pt);
						break;
					default:
						api.ClientToScreen(te.hwnd, pt);
						break;
				}
			}
			AdjustMenuBreak(hMenu);
			MainWindow.g_menu_click = bNoExec ? true : 2;
			const nVerb = api.TrackPopupMenuEx(hMenu, TPM_RIGHTBUTTON | TPM_RETURNCMD, pt.x, pt.y, te.hwnd, null, ContextMenu);
			if (bNoExec) {
				api.DestroyMenu(hMenu);
				return nVerb > 0 ? S_OK : S_FALSE;
			} else {
				const hr = ExecMenu4(Ctrl, Name, pt, hMenu, [ContextMenu], nVerb, FV);
				if (isFinite(hr)) {
					return hr;
				}
				item = items[nVerb - 1];
				Mode = 0;
			}
		}
		if (item && !bNoExec) {
			const s = item.getAttribute("Type");
			if (MainWindow.g_menu_button == 2 && api.PathMatchSpec(s, "Open;Open in new tab;Open in background")) {
				PopupContextMenu(item.text);
				return S_OK;
			}
			Exec(Ctrl, item.text, MainWindow.g_menu_button == 3 && s == "Open" ? "Open in new tab" : s, Ctrl.hwnd, pt);
			return S_OK;
		}
		if (Mode != 2) {
			return (nBase != 2 || ContextMenu) ? S_OK : S_FALSE;
		}
	}
	return S_FALSE;
}

ExecMenu4 = function (Ctrl, Name, pt, hMenu, arContextMenu, nVerb, FV) {
	if (ExtraMenuCommand[nVerb]) {
		if (api.Invoke(ExtraMenuCommand[nVerb], [Ctrl, pt, Name, nVerb]) != S_FALSE) {
			api.DestroyMenu(hMenu);
			return S_OK;
		}
	}
	for (let i in eventTE.menucommand) {
		const hr = api.Invoke(eventTE.menucommand[i], [Ctrl, pt, Name, nVerb, hMenu]);
		if (isFinite(hr) && hr == S_OK) {
			api.DestroyMenu(hMenu);
			return S_OK;
		}
	}
	for (let i in arContextMenu) {
		const ContextMenu = arContextMenu[i];
		if (ContextMenu && nVerb >= ContextMenu.idCmdFirst && nVerb <= ContextMenu.idCmdLast) {
			const FolderView = ContextMenu.FolderView;
			if (FolderView) {
				FolderView.Focus();
			}
			if (Ctrl.Type == CTRL_TV) {
				const sVerb = String(ContextMenu.GetCommandString(nVerb - ContextMenu.idCmdFirst, GCS_VERB)).toLowerCase();
				if (sVerb == "open") {
					const FV = FolderView || te.Ctrl(CTRL_FV);
					FV.Navigate(Ctrl.SelectedItem, GetNavigateFlags(FV));
					api.DestroyMenu(hMenu);
					return S_OK;
				} else if (sVerb == "rename") {
					Ctrl.Focus();
					wsh.SendKeys("{F2}");
				} else if (sVerb == "newfolder") {
					g_.NewFolderTV = Ctrl;
					g_.NewFolderTime = new Date().getTime() + 500;
				}
			}
			if (ContextMenu.InvokeCommand(0, te.hwnd, nVerb - ContextMenu.idCmdFirst, null, null, SW_SHOWNORMAL, 0, 0) == S_OK) {
				api.DestroyMenu(hMenu);
				return S_OK;
			}
		}
	}
	api.DestroyMenu(hMenu);
	if (FV && nVerb > 0x7000) {
		if (api.SendMessage(FV.hwndView, WM_COMMAND, nVerb, 0) == S_OK) {
			return S_OK;
		}
	}
}

CopyMenu = function (hSrc, hDest) {
	const mii = api.Memory("MENUITEMINFO");
	mii.cbSize = mii.Size;
	mii.fMask = MIIM_ID | MIIM_TYPE | MIIM_SUBMENU | MIIM_STATE;
	let n = api.GetMenuItemCount(hSrc);
	while (--n >= 0) {
		api.GetMenuItemInfo(hSrc, n, true, mii);
		const hSubMenu = mii.hSubMenu;
		if (hSubMenu) {
			mii.hSubMenu = api.CreateMenu();
		}
		api.InsertMenuItem(hDest, 0, true, mii);
		if (hSubMenu) {
			CopyMenu(hSubMenu, mii.hSubMenu);
		}
	}
}

GetViewMenu = function (arContextMenu, FV, hMenu, uCMF) {
	let ContextMenu = arContextMenu && arContextMenu[0];
	if (!ContextMenu) {
		ContextMenu = FV.ViewMenu();
		if (arContextMenu) {
			arContextMenu[0] = ContextMenu;
		}
	}
	if (ContextMenu) {
		ContextMenu.QueryContextMenu(hMenu, 0, 0x5001, 0x5fff, uCMF);
	}
	return ContextMenu;
}

GetBaseMenuEx = function (hMenu, nBase, FV, Selected, uCMF, Mode, SelItem, arContextMenu) {
	let ContextMenu;
	for (let i in eventTE.getbasemenuex) {
		ContextMenu = eventTE.getbasemenuex[i](hMenu, nBase, FV, Selected, uCMF, Mode, SelItem, arContextMenu);
		if (ContextMenu !== void 0) {
			return ContextMenu;
		}
	}
	switch (nBase) {
		case 2:
		case 4:
			let Items = Selected;
			if (!Items || !Items.Count) {
				Items = SelItem;
			}
			if (nBase == 2 || Items && Items.Count) {
				ContextMenu = arContextMenu && arContextMenu[1];
				if (!ContextMenu) {
					ContextMenu = api.ContextMenu(Items, FV);
					if (arContextMenu) {
						arContextMenu[1] = ContextMenu;
					}
				}
				if (ContextMenu) {
					ContextMenu.QueryContextMenu(hMenu, 0, 0x6001, 0x6fff, uCMF | CMF_ITEMMENU);
				}
			} else if (FV) {
				ContextMenu = GetViewMenu(arContextMenu, FV, hMenu, uCMF);
				const mii = api.Memory("MENUITEMINFO");
				mii.cbSize = mii.Size;
				mii.fMask = MIIM_FTYPE | MIIM_SUBMENU;
				for (let i = api.GetMenuItemCount(hMenu); i--;) {
					api.GetMenuItemInfo(hMenu, 0, true, mii);
					if (mii.hSubMenu || (mii.fType & MFT_SEPARATOR)) {
						api.DeleteMenu(hMenu, 0, MF_BYPOSITION);
						continue;
					}
					break;
				}
			}
			break;
		case 3:
			if (FV) {
				ContextMenu = GetViewMenu(arContextMenu, FV, hMenu, uCMF);
			}
			break;
		case 5:
		case 6:
			const id = nBase == 5 ? FCIDM_MENU_EDIT : FCIDM_MENU_VIEW;
			if (FV) {
				ContextMenu = GetViewMenu(arContextMenu, FV, hMenu, CMF_DEFAULTONLY);
				const hMenu2 = te.MainMenu(id);
				const oMenu = {};
				const oMenu2 = {};
				const mii = api.Memory("MENUITEMINFO");
				mii.cbSize = mii.Size;
				mii.fMask = MIIM_SUBMENU;
				for (let i = api.GetMenuItemCount(hMenu2); i-- > 0;) {
					let s = api.GetMenuString(hMenu2, i, MF_BYPOSITION);
					if (s) {
						s = s.toLowerCase().replace(/[&\(\)]/g, "");
						api.GetMenuItemInfo(hMenu2, i, true, mii);
						oMenu2[s] = mii.hSubMenu;
					}
				}
				MenuDbInit(hMenu, oMenu, oMenu2);
				MenuDbReplace(hMenu, oMenu, hMenu2);
			} else {
				const hMenu1 = te.MainMenu(id);
				CopyMenu(hMenu1, hMenu);
				api.DestroyMenu(hMenu1);
			}
			break;
		case 7:
			const dir = [GetText("Check for updates"), GetText("Get Add-ons..."), api.sprintf(99, GetText("Get %s..."), GetText("Icon")), null, api.sprintf(99, GetText("&About %s"), "Tablacus Explorer")];
			for (let i = 0; i < dir.length; ++i) {
				const s = dir[i];
				api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | (s === null ? MF_SEPARATOR : MF_STRING), i + 0x4011, s);
			}
			AddEvent("MenuCommand", function (Ctrl, pt, Name, nVerb) {
				const s = [CheckUpdate, GetAddons, GetIconPacks, null, ShowAbout][nVerb - 0x4011];
				if (s) {
					s(Ctrl, pt, Name, nVerb);
					return S_OK;
				}
			});
			break;
		case 8:
			api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 0x4001, GetText("&Add to Favorites..."));
			ExtraMenuCommand[0x4001] = AddFavoriteEx;
			api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 0x4002, GetText("&Edit"));
			ExtraMenuCommand[0x4002] = function () {
				ShowOptions("Tab=Menus&Menus=Favorites");
			};
			api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
			break;
		default:
			break;
	}
	return ContextMenu;
}

MenuDbInit = function (hMenu, oMenu, oMenu2) {
	for (let i = api.GetMenuItemCount(hMenu); i--;) {
		const mii = api.Memory("MENUITEMINFO");
		mii.cbSize = mii.Size;
		mii.fMask = MIIM_ID | MIIM_BITMAP | MIIM_SUBMENU | MIIM_DATA | MIIM_FTYPE | MIIM_STATE;
		let s = api.GetMenuString(hMenu, i, MF_BYPOSITION);
		api.GetMenuItemInfo(hMenu, i, true, mii);
		if (s) {
			s = s.toLowerCase().replace(/[&\(\)]/g, "");
			oMenu[s] = mii;
			api.RemoveMenu(hMenu, i, MF_BYPOSITION);
			if (oMenu2 && mii.hSubMenu && !oMenu2[s]) {
				MenuDbInit(mii.hSubMenu, oMenu, null)
			}
		} else {
			api.DeleteMenu(hMenu, i, MF_BYPOSITION);
		}
	}
}

MenuDbReplace = function (hMenu, oMenu, hMenu2) {
	for (let i = api.GetMenuItemCount(hMenu2); i-- > 0;) {
		const s = api.GetMenuString(hMenu2, 0, MF_BYPOSITION);
		let mii, s2;
		if (s) {
			s2 = s.toLowerCase().replace(/[&\(\)]/g, "");
			mii = oMenu[s2];
			if (!mii) {
				s2 = s2.replace(/\t.*/, "");
				mii = oMenu[s2];
			}
		}
		if (mii) {
			delete oMenu[s2];
			api.DeleteMenu(hMenu2, 0, MF_BYPOSITION);
		} else {
			mii = api.Memory("MENUITEMINFO");
			mii.cbSize = mii.Size;
			mii.fMask = MIIM_ID | MIIM_BITMAP | MIIM_SUBMENU | MIIM_DATA | MIIM_FTYPE | MIIM_STATE;
			api.GetMenuItemInfo(hMenu2, 0, true, mii);
			if (mii.hSubMenu) {
				api.DeleteMenu(hMenu2, 0, MF_BYPOSITION);
				continue;
			} else {
				api.RemoveMenu(hMenu2, 0, MF_BYPOSITION);
			}
		}
		mii.fMask = MIIM_ID | MIIM_BITMAP | MIIM_SUBMENU | MIIM_DATA | MIIM_FTYPE | MIIM_STATE;
		if (s) {
			mii.dwTypeData = s;
			mii.fMask |= MIIM_STRING;
		}
		api.InsertMenuItem(hMenu, MAXINT, false, mii);
	}
	for (let s in oMenu) {
		if (!/^\t/.test(s)) {
			api.InsertMenuItem(hMenu2, MAXINT, false, oMenu[s]);
		}
	}
	api.DestroyMenu(hMenu2);
}

GetAccelerator = function (s) {
	const res = /&(.)/.exec(s);
	return res ? res[1] : "";
}

GetNetworkIcon = function (path) {
	if (api.PathIsNetworkPath(path)) {
		if (/^\\\\[^\\]+$/.test(path)) {
			return "icon:shell32.dll,15";
		}
		if (fso.GetDriveName(path) == path.replace(/\\$/, "")) {
			if (/^\\\\/.test(path)) {
				return WINVER >= 0x600 ? "icon:shell32.dll,275" : "icon:shell32.dll,85";
			}
			return WINVER >= 0x600 ? "icon:shell32.dll,273" : "icon:shell32.dll,9";
		}
		return "folder:closed";
	}
}

RemoveSubMenu = function (hMenu, wID) {
	if (hMenu && wID) {
		var mii = api.Memory("MENUITEMINFO");
		mii.cbSize = mii.Size;
		mii.fMask = MIIM_SUBMENU | MIIM_FTYPE;
		if (api.GetMenuItemInfo(hMenu, wID, false, mii)) {
			api.DestroyMenu(mii.hSubMenu);
			mii.hSubMenu = 0;
			mii.fType &= ~MF_POPUP;
			api.SetMenuItemInfo(hMenu, wID, false, mii);
		}
	}
}

AddMenuIconFolderItem = function (mii, FolderItem, nHeight) {
	var path = MainWindow.GetIconImage(FolderItem, GetSysColor(COLOR_WINDOW), 2);
	MenusIcon(mii, path || api.GetDisplayNameOf(FolderItem, SHGDN_FORPARSING | SHGDN_ORIGINAL), nHeight, !path);
}

AddMenuImage = function (mii, image, id, nHeight) {
	mii.hbmpItem = image.GetHBITMAP(WINVER >= 0x600 ? -2 : GetSysColor(COLOR_MENU));
	if (mii.hbmpItem) {
		mii.fMask |= MIIM_BITMAP;
		if (id) {
			MainWindow.g_arBM[[id, nHeight].join("\t")] = mii.hbmpItem;
		} else {
			MainWindow.g_arBM.push(mii.hbmpItem);
		}
	}
}

MenusIcon = function (mii, src, nHeight, bIcon) {
	let image;
	mii.cbSize = mii.Size;
	if (src && src !== "-") {
		if ("string" === typeof src) {
			src = ExtractPath(te, src);
			if (!/:|^\\\\/i.test(src)) {
				src = BuildPath(te.Data.Installed, "script\\" + src);
			}
			mii.hbmpItem = MainWindow.g_arBM[[src, nHeight].join("\t")];
			if (mii.hbmpItem) {
				mii.fMask = mii.fMask | MIIM_BITMAP;
				return;
			}
		}
		var h16 = GetIconSize(0, 16);
		var h = nHeight < h16 ? GetIconSize(0, nHeight || 16) : nHeight || h16;
		if (/^object$/.test(src)) {
			image = src;
		} else {
			image = api.CreateObject("WICBitmap");
			if (bIcon || !image.FromFile(src)) {
				var hIcon = MakeImgIcon(src, 0, h, bIcon);
				image.FromHICON(hIcon);
				api.DestroyIcon(hIcon);
			}
		}
		if (h != image.GetHeight()) {
			image = image.GetThumbnailImage(h * image.GetWidth() / image.GetHeight(), h) || image;
		}
		AddMenuImage(mii, image, src);
	}
}

MakeMenus = function (hMenu, menus, arMenu, items, Ctrl, pt, nMin, arItem, bTrans) {
	const hMenus = [hMenu];
	let nPos = menus ? Number(menus[0].getAttribute("Pos")) : 0;
	let nLen = api.GetMenuItemCount(hMenu);
	let nResult = 0;
	nMin = nMin || 0;
	if (nPos < 0) {
		nPos += nLen + 1;
	}
	if (nPos > nLen || nPos < 0) {
		nPos = nLen;
	}
	nLen = arMenu.length;
	for (let i = 0; i < nLen; ++i) {
		const item = items[arMenu[i]];
		const s = (item.getAttribute("Name") || item.getAttribute("Mouse") || GetKeyName(item.getAttribute("Key")) || "").replace(/\\t/i, "\t");
		const strType = String(item.getAttribute("Type")).toLowerCase();
		const path = ExtractMacro(te, item.text);
		const strFlag = strType == "menus" ? item.text.toLowerCase() : "";
		let icon = item.getAttribute("Icon");
		if (!icon && te.Data.Conf_MenuIcon) {
			if (api.PathMatchSpec(strType, "Open;Open in new tab;Open in background")) {
				let pidl = api.ILCreateFromPath(path);
				if (!api.PathIsNetworkPath(PathUnquoteSpaces(path))) {
					if (api.ILIsEmpty(pidl) || pidl.Unavailable) {
						const res = /(.*?)\n/.exec(path);
						if (res) {
							pidl = api.ILCreateFromPath(res[1]);
						}
					}
				}
				icon = MainWindow.GetIconImage(pidl, GetSysColor(COLOR_WINDOW), true);
			} else if (api.PathMatchSpec(strType, "Exec;Selected items")) {
				const arg = api.CommandLineToArgv(path);
				if (!api.PathIsNetworkPath(arg[0])) {
					const pidl = api.ILCreateFromPath(arg[0]);
					if (!api.ILIsEmpty(pidl) && !pidl.Unavailable) {
						icon = MainWindow.GetIconImage(pidl, GetSysColor(COLOR_WINDOW), true);
					}
				}
			}
		}
		if (strFlag == "close") {
			hMenus.pop();
			if (!hMenus.length) {
				break;
			}
		} else {
			const ar = s.split(/\t/);
			ar[0] = ExtractMacro(te, ar[0]);
			if (bTrans && !item.getAttribute("Org")) {
				ar[0] = GetText(ar[0]);
			}
			if (ar.length > 1) {
				ar[1] = GetKeyName(ar[1]);
			}
			if (strFlag == "open") {
				const mii = api.Memory("MENUITEMINFO");
				mii.fMask = MIIM_STRING | MIIM_SUBMENU | MIIM_FTYPE;
				mii.fType = 0;
				mii.dwTypeData = ar.join("\t");
				mii.hSubMenu = api.CreateMenu();
				MenusIcon(mii, icon, item.getAttribute("Height"));
				api.InsertMenuItem(hMenus[hMenus.length - 1], nPos++, true, mii);
				hMenus.push(mii.hSubMenu);
			} else {
				nResult = arMenu[i] + nMin + 1;
				if (s == "/" || strFlag == "break") {
					api.InsertMenu(hMenus[hMenus.length - 1], nPos++, MF_BYPOSITION | MF_MENUBREAK | MF_DISABLED, 0, "");
				} else if (s == "//" || strFlag == "barbreak") {
					api.InsertMenu(hMenus[hMenus.length - 1], nPos++, MF_BYPOSITION | MF_MENUBARBREAK | MF_DISABLED, 0, "");
				} else if (s == "-" || strFlag == "separator") {
					api.InsertMenu(hMenus[hMenus.length - 1], nPos++, MF_BYPOSITION | MF_SEPARATOR, 0, null);
				} else if (s) {
					const mii = api.Memory("MENUITEMINFO");
					mii.fMask = MIIM_STRING | MIIM_ID;
					mii.wID = nResult;
					mii.dwTypeData = ar.join("\t");
					MenusIcon(mii, icon, item.getAttribute("Height"));
					RunEvent3(["MenuState", item.getAttribute("Type"), item.text].join(":"), Ctrl, pt, mii);
					if (arItem) {
						arItem[nResult - 1] = items[arMenu[i]];
					}
					api.InsertMenuItem(hMenus[hMenus.length - 1], nPos++, true, mii);
				}
			}
		}
	}
	return nResult > nMin ? nResult : nMin;
}

SaveXmlEx = function (filename, xml) {
	try {
		filename = BuildPath(te.Data.DataFolder, "config\\" + filename);
		xml.save(filename);
	} catch (e) {
		if (e.number != E_ACCESSDENIED) {
			ShowError(e, [GetText("Save"), filename].join(": "));
		}
	}
}

RunCommandLine = function (s) {
	var re = /\/select,([^,]+)/i.exec(s);
	if (re) {
		var arg = api.CommandLineToArgv(re[1]);
		Navigate(GetParentFolderName(arg[0]), SBSP_NEWBROWSER);
		SelectItem(te.Ctrl(CTRL_FV), arg[0], SVSI_SELECT | SVSI_FOCUSED | SVSI_ENSUREVISIBLE | SVSI_NOTAKEFOCUS, 99);
		return;
	}
	var arg = api.CommandLineToArgv(s.replace(/^\/e,|^\/n,|^\/root,/ig, ""));
	arg.shift();
	s = arg.join(" ");
	if (/^[A-Z]:\\|^\\\\/i.test(s) && IsExists(s)) {
		Navigate(s, SBSP_NEWBROWSER);
		return;
	}
	while (s = arg.shift()) {
		var ar = s.split(",");
		if (ar.length > 1) {
			Exec(te, GetSourceText(ar[1]), GetSourceText(ar[0]), te.hwnd, api.Memory("POINT"));
			continue;
		}
		Navigate(s, SBSP_NEWBROWSER);
	}
}

OpenNewProcess = function (fn, ex, mode, vOperation) {
	var uid;
	do {
		uid = String(Math.random()).replace(/^0?\./, "");
	} while (MainWindow.Exchange[uid]);
	MainWindow.Exchange[uid] = ex;
	return ShellExecute([PathQuoteSpaces(api.GetModuleFileName(null)), mode ? '/open' : '/run', fn, uid].join(" "), vOperation, mode ? SW_SHOWNORMAL : SW_SHOWNOACTIVATE);
}

GetAddonInfo = function (Id) {
	if (isFinite(Id)) {
		Id = te.Data.Addons.documentElement.childNodes[Id].nodeName;
	}
	var info = api.CreateObject("Object");

	var path = te.Data.Installed;
	var xml = api.CreateObject("Msxml2.DOMDocument");
	xml.async = false;
	var xmlfile = BuildPath(path, "addons", Id, "config.xml");
	if (fso.FileExists(xmlfile)) {
		xml.load(xmlfile);

		GetAddonInfo2(xml, info, "General", true);
		var lang = GetLangId();
		if (!/^en/.test(lang)) {
			GetAddonInfo2(xml, info, "en", true);
			info.Name = GetTextR(info.Name);
		}
		var res = /(\w+)_/.exec(lang);
		if (res && !/zh_cn/i.test(lang)) {
			GetAddonInfo2(xml, info, res[1]);
		}
		GetAddonInfo2(xml, info, lang);
		if (!info.Name) {
			info.Name = Id;
		}
	}
	return info;
}

GetAddonInfoName = function (Id, s) {
	return GetAddonInfo(Id)[s || "Name"];
}

OpenXml = function (strFile, bAppData, bEmpty, strInit) {
	var xml = api.CreateObject("Msxml2.DOMDocument");
	xml.async = false;
	var path = BuildPath(te.Data.DataFolder, "config\\" + strFile);
	if (fso.FileExists(path) && xml.load(path)) {
		return xml;
	}
	if (!bAppData) {
		path = BuildPath(te.Data.Installed, "config\\" + strFile);
		if (fso.FileExists(path) && xml.load(path)) {
			api.SHFileOperation(FO_MOVE, path, BuildPath(te.Data.DataFolder, "config"), FOF_SILENT | FOF_NOCONFIRMATION, false);
			return xml;
		}
	}
	if (strInit) {
		path = BuildPath(strInit, strFile);
		if (fso.FileExists(path) && xml.load(path)) {
			return xml;
		}
	}
	path = BuildPath(te.Data.Installed, "init\\" + strFile);
	if (fso.FileExists(path) && xml.load(path)) {
		return xml;
	}
	return bEmpty ? xml : null;
}

CreateXml = function (bRoot) {
	var xml = api.CreateObject("Msxml2.DOMDocument");
	xml.async = false;
	xml.appendChild(xml.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'));
	if (bRoot) {
		xml.appendChild(xml.createElement("TablacusExplorer"));
	}
	return xml;
}

OptionRef = function (Id, s, pt) {
	return MainWindow.RunEvent4("OptionRef", Id, s, pt);
}

OptionDecode = function (Id, p) {
	return MainWindow.RunEvent3("OptionDecode", Id, p);
}

OptionEncode = function (Id, p) {
	return MainWindow.RunEvent3("OptionEncode", Id, p);
}

EscapeUpdateFile = function (s) {
	return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

confirmYN = function (s, title) {
	return MessageBox(s, title, MB_ICONQUESTION | MB_YESNO) == IDYES;
}

confirmOk = function (s, title) {
	return MessageBox(s || "Are you sure?", title, MB_ICONQUESTION | MB_OKCANCEL) == IDOK;
}

MessageBox = function (s, title, uType) {
	return api.MessageBox(api.GetForegroundWindow(), GetTextR(s), GetTextR(title) || TITLE, uType);
}

GethwndFromPid = function (ProcessId, nDT) {
	var hProcess = api.OpenProcess(PROCESS_QUERY_INFORMATION, false, ProcessId);
	if (hProcess) {
		api.WaitForInputIdle(hProcess, 9999);
		api.CloseHandle(hProcess);
	}
	var hwnd = api.GetTopWindow(null);
	var ppid = api.Memory("DWORD");
	do {
		if (api.IsWindowVisible(hwnd)) {
			api.GetWindowThreadProcessId(hwnd, ppid);
			if (ProcessId == ppid[0]) {
				if ((!nDT && !api.GetWindowLongPtr(hwnd, GWLP_HWNDPARENT)) || ((nDT & 1) && (api.GetWindowLongPtr(hwnd, GWL_EXSTYLE) & 16)) || ((nDT & 2) && api.GetProp(hwnd, 'OleDropTargetInterface'))) {
					return hwnd;
				}
			}
		}
	} while (hwnd = api.GetWindow(hwnd, GW_HWNDNEXT));
	return null;
}

PopupContextMenu = function (Item, FV) {
	if ("string" === typeof Item) {
		var arg = api.CommandLineToArgv(Item);
		Item = api.CreateObject("FolderItems");
		for (var i in arg) {
			Item.AddItem(arg[i]);
		}
	}
	var hMenu = api.CreatePopupMenu();
	var ContextMenu = api.ContextMenu(Item, FV);
	if (ContextMenu) {
		var uCMF = (api.GetKeyState(VK_SHIFT) < 0) ? CMF_EXTENDEDVERBS : CMF_NORMAL;
		ContextMenu.QueryContextMenu(hMenu, 0, 1, 0x7FFF, uCMF);
		RemoveCommand(hMenu, ContextMenu, "delete");
		var pt = api.Memory("POINT");
		api.GetCursorPos(pt);
		var nVerb = api.TrackPopupMenuEx(hMenu, TPM_RIGHTBUTTON | TPM_RETURNCMD, pt.x, pt.y, te.hwnd, null, ContextMenu);
		if (nVerb) {
			ContextMenu.InvokeCommand(0, te.hwnd, nVerb - 1, null, null, SW_SHOWNORMAL, 0, 0);
		}
	}
	api.DestroyMenu(hMenu);
}

XmlItem2Json = function (item) {
	var json = [];
	if (item) {
		if (item.text) {
			json.push('"text":"' + EscapeJson(item.text) + '"');
		}
		var attrs = item.attributes;
		if (attrs) {
			for (var i = 0; i < attrs.length; ++i) {
				json.push('"' + EscapeJson(attrs[i].name) + '":"' + EscapeJson(attrs[i].value) + '"');
			}
		}
	}
	return "{" + json.join(",") + "}";
}

XmlItems2Json = function (items) {
	var json = [];
	if (items) {
		for (var i = 0; i < items.length; ++i) {
			json.push(XmlItem2Json(items[i]))
		}
	}
	return "[" + json.join(",") + "]";
}

GetAddonElement = function (id) {
	var items = te.Data.Addons.getElementsByTagName(id.toLowerCase());
	if (items.length) {
		return items[0];
	}
	return {
		getAttribute: function (s) {
			return "";
		},
		setAttribute: function () { }
	}
}

GetAddonOption = function (id, strTag) {
	return GetAddonElement(id).getAttribute(strTag);
}

GetAddonOptionEx = function (id, strTag) {
	return GetNum(GetAddonOption(id, strTag));
}

GetInnerFV = function (id) {
	var TC = te.Ctrl(CTRL_TC, id);
	if (TC && TC.SelectedIndex >= 0) {
		return TC.Selected;
	}
	return null;
}

OpenInExplorer = function (pid1) {
	if (pid1) {
		CancelWindowRegistered();
		sha.Explore(pid1.FolderItem || pid1);
	}
}

ShowDialog = function (fn, opt) {
	opt.opener = window;
	if (!/:/.test(fn)) {
		fn = location.href.replace(/[^\/]*$/, fn);
	}
	var r = opt.r || Math.abs(MainWindow.DefaultFont.lfHeight) / 12;
	return te.CreateCtrl(CTRL_SW, fn, opt, WebBrowser.hwnd, (opt.width > 99 ? opt.width : 750) * r, (opt.height > 99 ? opt.height : 530) * r, opt.left, opt.top);
}


ShowDialogEx = function (mode, w, h, Id, opt) {
	if (!opt) {
		opt = api.CreateObject("Object");
	}
	opt.MainWindow = MainWindow;
	opt.Query = mode;
	opt.width = w;
	opt.height = h;
	opt.Id = Id;
	opt.InvokeUI = InvokeUI;
	ShowDialog(BuildPath(te.Data.Installed, "script\\dialog.html"), opt);
}

ShowNew = function (Ctrl, pt, Mode) {
	const FV = GetFolderView(Ctrl, pt);
	const path = api.GetDisplayNameOf(FV, SHGDN_FORPARSING | SHGDN_ORIGINAL);
	if (/^[A-Z]:\\|^\\\\/i.test(path)) {
		const opt = api.CreateObject("Object");
		opt.Mode = Mode;
		opt.path = path;
		opt.FV = FV;
		opt.Modal = false;
		ShowDialogEx("new", 480, 120, null, opt);
	}
}

CreateNewFolder = function (Ctrl, pt) {
	ShowNew(Ctrl, pt, "folder");
	return S_OK;
}

CreateNewFile = function (Ctrl, pt) {
	ShowNew(Ctrl, pt, "file");
	return S_OK;
}

GetLangId = function (nDefault) {
	if (!nDefault && te.Data.Conf_Lang) {
		return te.Data.Conf_Lang;
	}
	var lang = (navigator.userLanguage || navigator.language).replace(/\-/, '_').toLowerCase();
	if (nDefault != 2) {
		if (!fso.FileExists(fso.BuildPath(te.Data.Installed, "lang\\" + lang + ".xml"))) {
			lang = lang.replace(/_.*/, "");
		}
	}
	if (!te.Data.Conf_Lang) {
		te.Data.Conf_Lang = lang;
	}
	return lang;
}

GetText = function (id) {
	try {
		id = id.replace(/&amp;/g, "&");
		return MainWindow.Lang[id.toLowerCase()] || id;
	} catch (e) { }
	return id;
}

GetTextR = function (id) {
	var res = /^\@(.+),-(\d+)(\[[^\]]+\])?$/i.exec(id);
	if (res) {
		var hModule = api.LoadLibraryEx(res[1], 0, LOAD_LIBRARY_AS_DATAFILE);
		var s = api.LoadString(hModule, GetNum(res[2]));
		if (!s && res[3]) {
			var ar = res[3].slice(1, -1).split("|");
			for (var i = 0; i < ar.length && !s; ++i) {
				res = /^-(\d+)$/.exec(ar[i]);
				s = res ? api.LoadString(hModule, GetNum(res[1])) : GetTextR(ar[i]);
			}
		}
		if (hModule) {
			api.FreeLibrary(hModule);
		}
		if (s) {
			return s;
		}
	}
	res = /^({[0-9a-f\-]+} \d+)\|?(.*)$/i.exec(id);
	if (res) {
		var s = api.PSGetDisplayName(res[1]);
		return (s && s.indexOf("{") < 0) ? s : GetTextR(res[2]);
	}
	res = /^(\d+)\-bit$/i.exec(id);
	if (res) {
		return (api.LoadString(hShell32, 31092) || "%s (32-bit)").replace(/^%s\s\(|\)$/g, "").replace(/\d+/, res[1]);
	}
	return GetText(id) || "";
}

GetSourceText = function (s) {
	try {
		return (MainWindow.LangSrc || LangSrc)[s] || s;
	} catch (e) {
		return s;
	}
}

SetLang2 = function (s, v) {
	var sl = s.toLowerCase();
	if (!MainWindow.Lang[sl] && !MainWindow.LangSrc[v]) {
		MainWindow.Lang[sl] = v;
		MainWindow.LangSrc[v] = s;
		if (/&/.test(s)) {
			SetLang2(s.replace(/\(&\w\)|&/, ""), v.replace(/\(&\w\)|&/, ""));
		}
		if (/\.\.\.$/.test(s)) {
			SetLang2(StripAmp(s), StripAmp(v));
		}
	}
}

CloseWindows = function (hwnd) {
	let hwnd1;
	while (hwnd1 = api.FindWindowEx(null, hwnd1, null, null)) {
		if (hwnd == api.GetWindowLongPtr(hwnd1, GWLP_HWNDPARENT)) {
			api.PostMessage(hwnd1, WM_CLOSE, 0, 0);
		}
	}
}

LoadDBFromTSV = function (DB, fn) {
	DB.Clear();
	const ado = OpenAdodbFromTextFile(fn, "utf-8");
	if (ado) {
		while (!ado.EOS) {
			var res = /^([^\t]*)\t(.*)$/.exec(ado.ReadText(adReadLine));
			if (res) {
				DB.Set(res[1], res[2]);
			}
		}
		ado.Close();
	}
}

SaveDBToTSV = function (DB, fn) {
	try {
		var ado = api.CreateObject("ads");
		ado.CharSet = "utf-8";
		ado.Open();
		DB.ENumCB(function (n, s) {
			ado.WriteText([n, s].join("\t") + "\r\n");
		});
		ado.SaveToFile(fn, 2);
		ado.Close();
	} catch (e) { }
}

FolderMenu = {
	Items: [],
	SortMode: 0,
	SortReverse: false,

	Clear: function () {
		this.Items.length = 0;
		delete this.Filter;
	},

	Open: function (FolderItem, x, y, filter, nParent, hParent, wID) {
		this.Clear();
		this.Filter = filter;
		const hMenu = api.CreatePopupMenu();
		this.OpenMenu(hMenu, FolderItem, hParent, wID, nParent);
		let Verb = this.TrackPopupMenu(hMenu, TPM_RIGHTBUTTON | TPM_RETURNCMD, x, y);
		Verb = Verb ? this.Items[Verb - 1] : null;
		this.Clear();
		return Verb;
	},

	TrackPopupMenu: function (hMenu, uFlags, x, y) {
		MainWindow.g_menu_click = true;
		this.MenuLoop = true;
		const nVerb = api.TrackPopupMenuEx(hMenu, uFlags, x, y, te.hwnd, null, null);
		delete this.MenuLoop;
		api.DestroyMenu(hMenu);
		return nVerb;
	},

	OpenSubMenu: function (hMenu, wID, hSubMenu, nParent) {
		this.OpenMenu(api.sscanf(hSubMenu, "%llx"), this.Items[wID - 1], api.sscanf(hMenu, "%llx"), wID, nParent);
	},

	OpenMenu: function (hMenu, FolderItem, hParent, wID, nParent) {
		let Item;
		if (!FolderItem) {
			return;
		}
		if (!/object|function/.test(typeof FolderItem)) {
			FolderItem = api.ILCreateFromPath(FolderItem);
		}
		let bSep = false;
		if (!nParent && !api.ILIsEmpty(FolderItem) && !api.ILIsParent(1, FolderItem, false)) {
			Item = api.ILRemoveLastID(FolderItem);
			let bMatch = IsFolderEx(Item);
			if (this.Filter) {
				bMatch = PathMatchEx(bMatch ? Item.Name + ".folder" : Item.Name, this.Filter);
			}
			if (bMatch) {
				this.AddMenuItem(hMenu, Item, "../", false, true);
				bSep = true;
			}
		}
		const Items = this.Enum(FolderItem);
		if (Items) {
			const nCount = Items.Count;
			let ar = new Array(nCount);
			for (var i = nCount; i--;) {
				ar[i] = i;
			}
			if (this.SortMode >= 0) {
				let d;
				try {
					d = fso.GetDrive(fso.GetDriveName(FolderItem.Path));
				} catch (e) {
					d = { FileSystem: "NTFS" };
				}
				if (!/NTFS/i.test(d.FileSystem) || this.SortMode || this.Filter || FolderItem.IsBrowsable) {
					this.Sort(Items, ar);
				}
			}
			if (this.SortReverse) {
				ar = ar.reverse();
			}
			for (let i = 0; i < nCount; ++i) {
				Item = Items.Item(ar[i]);
				let bMatch = IsFolderEx(Item) || api.ILIsParent(MainWindow.g_pidlCP, Item, false);
				if (this.Filter) {
					bMatch = PathMatchEx(bMatch ? Item.Name + ".folder" : Item.Name, this.Filter);
				}
				if (bMatch) {
					if (bSep) {
						api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
						bSep = false;
					}
					this.AddMenuItem(hMenu, Item);
					wID = null;
				}
			}
		}
		RemoveSubMenu(hParent, wID);
		MainWindow.RunEvent1("FolderMenuCreated", hMenu, FolderItem, hParent);
	},

	Enum: function (FolderItem) {
		var Items = GetEnum(FolderItem, te.Data.Conf_MenuHidden);
		if (Items) {
			MainWindow.RunEvent1("AddItems", Items, FolderItem);
			if (!Items.Count) {
				Items.Item = function (i) {
					return api.ILCreateFromPath(Items[i]);
				}
				Items.Count = Items.length;
			}
		}
		return Items;
	},

	Sort: function (Items, ar) {
		ar.sort(function (a, b) {
			return api.CompareIDs(FolderMenu.SortMode, Items.Item(a), Items.Item(b));
		});
	},

	AddMenuItem: function (hMenu, FolderItem, Name, bSelect, bParent) {
		const mii = api.Memory("MENUITEMINFO");
		mii.cbSize = mii.Size;
		mii.fMask = MIIM_ID | MIIM_STRING | MIIM_BITMAP | MIIM_SUBMENU;
		if (bSelect && Name) {
			mii.dwTypeData = Name;
		} else {
			const s = (Name || "") + MainWindow.GetFolderItemName(FolderItem);
			if (!s) {
				return;
			}
			mii.dwTypeData = s;
		}
		AddMenuIconFolderItem(mii, FolderItem);
		this.Items.push(FolderItem);
		mii.wID = this.Items.length;
		const cc = this.Filter ? SFGAO_FOLDER : SFGAO_HASSUBFOLDER;
		if (!bSelect && api.GetAttributesOf(FolderItem, cc | SFGAO_BROWSABLE | SFGAO_LINK) == cc) {
			let o;
			try {
				o = fso.GetDrive(fso.GetDriveName(FolderItem.Path));
			} catch (e) {
				o = { IsReady: FolderItem && !FolderItem.Unavailable };
			}
			if (o.IsReady) {
				api.PathIsDirectory(FolderItem.Path, 9, 2);
				mii.hSubMenu = api.CreateMenu();
				api.InsertMenu(mii.hSubMenu, 0, MF_BYPOSITION | MF_STRING, 0, api.sprintf(99, '\tJScript\tFolderMenu.OpenSubMenu("%llx",%d,"%llx",%d)', hMenu, mii.wID, mii.hSubMenu, !bParent));
			}
		}
		if (MainWindow.RunEvent2("FolderMenuAddMenuItem", hMenu, mii, FolderItem, bSelect) == S_OK) {
			api.InsertMenuItem(hMenu, MAXINT, false, mii);
		}
	},

	Invoke: function (FolderItem, wFlags, FV) {
		if (FolderItem) {
			const path = api.GetDisplayNameOf(FolderItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING | SHGDN_ORIGINAL);
			const bVirtual = api.ILIsParent(1, FolderItem, false) || FolderItem.Unavailable;
			if (MainWindow.g_menu_button == 4) {
				if (!bVirtual) {
					const pdwEffect = [DROPEFFECT_COPY | DROPEFFECT_MOVE | DROPEFFECT_LINK];
					api.SHDoDragDrop(null, FolderItem, te, pdwEffect[0], pdwEffect, true);
				}
				return;
			}
			if (MainWindow.g_menu_button == 2) {
				const pt = api.Memory("POINT");
				api.GetCursorPos(pt);
				if (bVirtual) {
					if (!confirmOk(path, TITLE, MB_OK | MB_ICONINFORMATION)) {
						return;
					}
				} else {
					const FV = te.Ctrl(CTRL_FV);
					const AltSelectedItems = FV.AltSelectedItems;
					const Items = api.CreateObject("FolderItems");
					Items.AddItem(FolderItem);
					FV.AltSelectedItems = Items;
					if (ExecMenu(FV, "Context", pt, 1) != S_OK) {
						PopupContextMenu(FolderItem);
					}
					FV.AltSelectedItems = AltSelectedItems;
					MainWindow.ShowStatusText(FV, "", 0);
					return;
				}
			}
			if (res = /^`(.*)`$/.exec(path)) {
				ShellExecute(res[1], null, SW_SHOWNORMAL);
				return;
			}
			if (res = /^javascript:(.*)$/i.exec(path)) {
				try {
					new Function(res[1])();
				} catch (e) {
					ShowError(e, res[1]);
				}
				return;
			}
			if (FolderItem.Enum || ((MainWindow.g_menu_button == 3 || isFinite(wFlags)) && (FolderItem.IsFolder || (!FolderItem.IsFileSystem && FolderItem.IsBrowsable)))) {
				Navigate(FolderItem, isFinite(wFlags) ? wFlags : GetOpenMode());
				return;
			}
			if (!FV) {
				FV = te.Ctrl(CTRL_FV);
			}
			const AltSelectedItems = FV.AltSelectedItems;
			const Items = api.CreateObject("FolderItems");
			Items.AddItem(FolderItem);
			FV.AltSelectedItems = Items;
			if (ExecMenu(FV, "Default", null, 2) != S_OK) {
				ShellExecute(PathQuoteSpaces(api.GetDisplayNameOf(FolderItem, SHGDN_ORIGINAL | SHGDN_FORPARSING)), null, SW_SHOWNORMAL);
			}
			FV.AltSelectedItems = AltSelectedItems;
		}
	},

	Location: function (o) {
		let pt;
		if (window.chrome) {
			pt = api.Memory("POINT");
			api.GetCursorPos(pt);
		} else {
			pt = GetPos(o, 9);
			pt.x += o.offsetWidth;
		}
		FolderMenu.LocationEx(pt.x, pt.y);
	},

	LocationEx: function (x, y) {
		FolderMenu.Clear();
		const hMenu = api.CreatePopupMenu();
		RunEvent3("LocationPopup", hMenu);
		const nVerb = FolderMenu.TrackPopupMenu(hMenu, TPM_RIGHTALIGN | TPM_LEFTBUTTON | TPM_RIGHTBUTTON | TPM_RETURNCMD, x, y);
		const FolderItem = nVerb ? FolderMenu.Items[nVerb - 1] : null;
		FolderMenu.Clear();
		FolderMenu.Invoke(FolderItem);
	}
};

CreateSync = function (n, a, b, c, d, e) {
	const ar = n.split(".");
	let fn = window;
	let s, parent;
	while (s = ar.shift()) {
		parent = fn;
		fn = fn[s];
	}
	return new fn(a, b ,c ,d , e);
}

CalcRef = function (o, nPos, nDiff) {
	if (o) {
		o[nPos] += nDiff;
	}
}

GetTEEvent = function (en) {
	return eventTE[en.toLowerCase()];
}

BasicDB = function (name, bLoad, bLC) {
	this.DB = {};

	this.Get = function (n) {
		if (n.Path) {
			n =  n.Path;
		}
		return this.DB[this.LC ? n.toLowerCase() : n] || "";
	}

	this.Set = function (n, s) {
		if (n.Path) {
			n = n.Path;
		}
		if (this.LC) {
			 n = n.toLowerCase();
		}
		var s0 = this.DB[n] || "";
		if (s0 != s) {
			if (s) {
				this.DB[n] = s;
			} else {
				delete this.DB[n];
			}
			this.bChanged = true;
			if (this.OnChange) {
				api.Invoke(this.OnChange, [n, s, s0]);
			}
		}
	}

	this.ENumCB = function (fncb) {
		for (let n in this.DB) {
			if (api.Invoke(fncb, [n, this.DB[n]]) < 0) {
				break;
			}
		}
	}

	this.Clear = function () {
		for (let n in this.DB) {
			delete this.DB[n];
		}
		return this;
	}

	this.Load = function () {
		LoadDBFromTSV(this, this.path);
		return this;
	}

	this.Save = function () {
		if (this.bChanged) {
			SaveDBToTSV(this, this.path);
			this.bChanged = false;
		}
	}

	this.Close = function () { }

	this.path = OrganizePath(name, BuildPath(te.Data.DataFolder, "config")) + ".tsv";
	this.LC = bLC;
	if (bLoad) {
		this.Load();
	}
}

SimpleDB = BasicDB;

if ("undefined" === typeof clipboardData) {
	clipboardData = {
		setData: function (format, data) {
			api.SetClipboardData(data);
			return true;
		},
		getData: api.GetClipboardData
	}
}
