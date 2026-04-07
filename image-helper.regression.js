const fs = require("fs");
const vm = require("vm");
const path = require("path");

const filePath = path.join(__dirname, "image-helper.user.js");
const source = fs.readFileSync(filePath, "utf8");
const start = source.indexOf("  // ===== Rules: helpers =====");
const end = source.indexOf(
  "  // =========================================================\n  // 2) 提取候选图片"
);

if (start < 0 || end < 0 || end <= start) {
  throw new Error("无法定位 image-helper.user.js 中的规则代码块边界");
}

let snippet = source.slice(start, end);
snippet +=
  "\nthis.__imageHelperTestExports = { " +
  [
    "safeUrlParse",
    "createRegexRule",
    "createQueryReplaceRule",
    "isCloudinaryTransformSegment",
    "stripCloudinaryUploadTransforms",
    "createCloudinaryUploadStripRule",
    "REUSABLE_RULES",
    "BRAND_RULES",
    "EXACT_HOST_MAP",
    "PARTIAL_MATCH_RULES",
    "HOST_RULE_MAP",
    "detectHostTypeByUrlObj",
    "cleanUrl",
  ].join(", ") +
  " };";

const context = { URL, console };
vm.createContext(context);
vm.runInContext(snippet, context, {
  filename: "image-helper.rules.test-runtime.js",
});

const api = context.__imageHelperTestExports;
if (!api) throw new Error("测试导出失败");

const requiredUiSnippets = [
  'id="tm-open-clean"',
  'id="tm-open-raw"',
  "已打开当前链接",
  "已打开原始链接",
];

for (const snippetText of requiredUiSnippets) {
  if (!source.includes(snippetText)) {
    throw new Error(`缺少链接打开按钮相关 UI 片段: ${snippetText}`);
  }
}

const cases = [
  {
    name: "Complex: 剥离连续 transform 并保留 sanity-new 资源路径",
    input:
      "https://images.complex.com/complex/image/upload/c_crop,h_1081,w_1920,x_0,y_0/g_xy_center,x_960,y_541,q_auto,f_avif,c_fill,ar_1.78,w_1920/sanity-new/DOAF_x_GOAT_x_FC_AM95_16X9_Bespoke_2_ogzh5t",
    expected:
      "https://images.complex.com/complex/image/upload/sanity-new/DOAF_x_GOAT_x_FC_AM95_16X9_Bespoke_2_ogzh5t",
    hostType: "complex-cloudinary",
  },
  {
    name: "Complex: 非 sanity-new 资源路径时不误清洗",
    input:
      "https://images.complex.com/complex/image/upload/c_crop,h_1081,w_1920,x_0,y_0/g_xy_center,x_960,y_541,q_auto,f_avif,c_fill,ar_1.78,w_1920/editorial/DOAF_x_GOAT_x_FC_AM95_16X9_Bespoke_2_ogzh5t",
    expected:
      "https://images.complex.com/complex/image/upload/c_crop,h_1081,w_1920,x_0,y_0/g_xy_center,x_960,y_541,q_auto,f_avif,c_fill,ar_1.78,w_1920/editorial/DOAF_x_GOAT_x_FC_AM95_16X9_Bespoke_2_ogzh5t",
    hostType: "complex-cloudinary",
  },
  {
    name: "Puma: 剥离 /upload/ 连续 transform 并保留 global 资源路径",
    input:
      "https://images.puma.com/upload/f_auto,q_auto,b_rgb:fafafa/global/12345/fnd/PNA/fmt/png/example.png",
    expected:
      "https://images.puma.com/upload/global/12345/fnd/PNA/fmt/png/example.png",
    hostType: "puma-intl",
  },
  {
    name: "Puma: 非 global 资源路径时不误清洗",
    input:
      "https://images.puma.com/upload/f_auto,q_auto,c_fill/catalog/product/example.png",
    expected:
      "https://images.puma.com/upload/f_auto,q_auto,c_fill/catalog/product/example.png",
    hostType: "puma-intl",
  },
  {
    name: "GOAT: 折叠 transform 并移除已知派生图片参数",
    input:
      "https://image.goat.com/transform/v1/attachments/product_template_additional_pictures/images/123/original/example.jpg?action=crop&width=4000",
    expected:
      "https://image.goat.com/attachments/product_template_additional_pictures/images/123/original/example.jpg",
    hostType: "goat",
  },
  {
    name: "MyShopline 图片 CDN: 保守移除 w/h/q 展示参数并命中通用 hostType",
    input:
      "https://img.myshopline.com/image/store/1234567890/example.jpg?w=1200&h=1200&q=80",
    expected: "https://img.myshopline.com/image/store/1234567890/example.jpg",
    hostType: "myshopline-image",
  },
  {
    name: "Hypebeast CDN: 解码 pathname 中的 percent-encoded 原图 URL",
    input:
      "https://image-cdn.hypb.st/https%3A%2F%2Fs3.store.hypebeast.com%2Fmedia%2Fimage%2F54%2Fdd%2Flongtee-1-1-662c4.jpg?fit=max&w=720&q=90",
    expected:
      "https://s3.store.hypebeast.com/media/image/54/dd/longtee-1-1-662c4.jpg",
    hostType: "hypebeast-cdn",
  },
  {
    name: "Sneaker Freaker CDN: 解码 pathname 中的 percent-encoded 原图 URL",
    input:
      "https://sneaker-freaker.b-cdn.net/https%3A%2F%2Fcdn.sneakerfreaker.com%2Fwp-content%2Fuploads%2F2024%2F10%2Fshoe-name-hero.jpg?width=1200&quality=90",
    expected:
      "https://cdn.sneakerfreaker.com/wp-content/uploads/2024/10/shoe-name-hero.jpg",
    hostType: "sneaker-freaker-bcdn",
  },
  {
    name: "Catalog 香港: 保守去 query，保留原始 Magento 媒体路径",
    input:
      "https://catalog.hkstore.com/media/catalog/product/1/2/129l49205800_1.jpg?optimize=medium&bg-color=243,243,243&fit=bounds&height=840&width=670&canvas=670:840",
    expected:
      "https://catalog.hkstore.com/media/catalog/product/1/2/129l49205800_1.jpg",
    hostType: "hkstore-catalog",
  },
  {
    name: "Zalora Dynamic CDN: 提取包装 pathname 后段的明文原图 URL",
    input:
      "https://dynamic.zacdn.com/xznq8HOrSO46bWG6KMoxUd6QEQA=/filters:quality(70):format(webp)/https://static-hk.zacdn.com/p/under-armour-9200-2150437-1.jpg",
    expected: "https://static-hk.zacdn.com/p/under-armour-9200-2150437-1.jpg",
    hostType: "zalora-dynamic-cdn",
  },
  {
    name: "Nike: 保持 /a/images/ 专用路径回源逻辑",
    input:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/abc12345/sample-image.jpg",
    expected: "https://static.nike.com/a/images/abc12345/sample-image.png",
    hostType: "nike-global",
  },
  {
    name: "MLB Korea: 保持 cdn-cgi image 参数协议",
    input:
      "https://static-resource.mlb-korea.com/cdn-cgi/image/width=750,format=webp/images/product/sample.png",
    expected:
      "https://static-resource.mlb-korea.com/cdn-cgi/image/q=100,format=auto/images/product/sample.png",
    hostType: "mlb-korea",
  },
  {
    name: "Under Armour Scene7: 保持 query 重写协议",
    input:
      "https://underarmour.scene7.com/is/image/Underarmour/3020001-001_DEFAULT?rp=standard-30pad|gridTileDesktop&scl=1",
    expected:
      "https://underarmour.scene7.com/is/image/Underarmour/3020001-001_DEFAULT?scl=1&fmt=png-alpha&qlt=100",
    hostType: "underarmour-scene7",
  },
  {
    name: "Footlocker Scene7: 保持 zoom2000png token",
    input:
      "https://assets.footlocker.com/is/image/FLEU/314215208404_01?wid=520&hei=520",
    expected:
      "https://assets.footlocker.com/is/image/FLEU/314215208404_01?$zoom2000png$",
    hostType: "footlocker-scene7",
  },
  {
    name: "Sport Vision MK: 独立去除 thumbs 与末段冗余 /images/ 路径",
    input:
      "https://www.sportvision.mk/files/thumbs/files/images/slike_proizvoda/media/SX5/SX5199-900/images/thumbs_1200/SX5199-900_1200_1200px.jpg",
    expected:
      "https://www.sportvision.mk/files/images/slike_proizvoda/media/SX5/SX5199-900/SX5199-900.jpg",
    hostType: "sportvision-mk",
  },
  {
    name: "Sport Vision HR: 复用 MK 独立原图规则链",
    input:
      "https://www.sportvision.hr/files/thumbs/files/images/slike_proizvoda/media/SX5/SX5199-900/images/thumbs_1200/SX5199-900_1200_1200px.jpg",
    expected:
      "https://www.sportvision.hr/files/images/slike_proizvoda/media/SX5/SX5199-900/SX5199-900.jpg",
    hostType: "sportvision-mk",
  },
];

let failed = 0;
for (const testCase of cases) {
  const result = api.cleanUrl(testCase.input);
  const ok =
    result.hostType === testCase.hostType && result.clean === testCase.expected;
  if (!ok) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error(
      `  hostType: expected=${testCase.hostType} actual=${result.hostType}`
    );
    console.error(`  clean:    expected=${testCase.expected}`);
    console.error(`            actual=${result.clean}`);
    continue;
  }
  console.log(`PASS: ${testCase.name}`);
}

if (failed > 0) {
  console.error(
    `Regression failed: ${failed}/${cases.length} cases mismatched.`
  );
  process.exitCode = 1;
} else {
  console.log(`All ${cases.length} regression cases passed.`);
}
