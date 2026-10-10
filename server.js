const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
    throw new Error("请在 Render 中设置 ADMIN_PASSWORD 和 SESSION_SECRET");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

app.use(session({
    name: "star_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: "auto",
        sameSite: "strict",
        maxAge: 2 * 60 * 60 * 1000
    }
}));

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "redirect.json");

function getTarget() {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return typeof data.target === "string" ? data.target : "";
    } catch {
        return "";
    }
}

function saveTarget(target) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tempFile = DATA_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify({ target }, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
}

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return (
            (url.protocol === "https:" || url.protocol === "http:") &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password
        );
    } catch {
        return false;
    }
}

app.get("/", (req, res) => {
    res.set("Cache-Control", "no-store");
    const target = getTarget();

    if (!target) {
        return res.status(503).send(`<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>网站暂未配置</title>
<body style="font-family:Arial;text-align:center;padding:60px 20px">
<h2>网站暂未配置</h2><p>管理员尚未设置跳转目标网址。</p>
</body></html>`);
    }

    return res.redirect(302, target);
});

app.get("/admin", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.post("/admin/login", (req, res) => {
    const password = req.body.password;

    if (typeof password !== "string" ||
        password.length > 256 ||
        password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "管理员密码错误"
        });
    }

    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "登录失败，请重试"
            });
        }

        req.session.isAdmin = true;
        req.session.save((saveErr) => {
            if (saveErr) {
                return res.status(500).json({
                    success: false,
                    message: "会话保存失败"
                });
            }
            res.json({ success: true });
        });
    });
});

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin === true) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: "请先登录管理员后台"
    });
}

app.get("/admin/config", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ target: getTarget() });
});

app.post("/admin/config", requireAdmin, (req, res) => {
    const target = req.body.target;

    if (typeof target !== "string" || !isValidUrl(target)) {
        return res.status(400).json({
            success: false,
            message: "请输入有效的 HTTP 或 HTTPS 网址"
        });
    }

    try {
        saveTarget(target);
        res.json({
            success: true,
            message: "跳转网址已保存",
            target
        });
    } catch (error) {
        console.error("保存失败:", error.message);
        res.status(500).json({
            success: false,
            message: "保存失败，请检查数据目录是否可写"
        });
    }
});

app.post("/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("star_admin");
        res.json({ success: true });
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Redirect site running on port ${PORT}`);
});
