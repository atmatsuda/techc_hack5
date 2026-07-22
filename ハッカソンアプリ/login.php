<?php
require_once __DIR__ . '/includes/header.php';
?>
    <main>
        <h1>ログイン</h1>
        <form action="" method="post">
            <label for="email">メールアドレス</label>
            <input type="email" id="email" name="email" required>

            <label for="password">パスワード</label>
            <input type="password" id="password" name="password" required>

            <button type="submit">ログイン</button>
        </form>
    </main>
<?php
require_once __DIR__ . '/includes/footer.php';
