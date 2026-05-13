$file = "apps/web/src/hooks/useRoom.ts"
$content = Get-Content $file -Raw

# Find the section from "Stop publishing media" to "Enable/disable video" and rewrite it
$fixed = $content -replace @"
  /\*\*
   \* Stop publishing media
   \*/
  const unpublishMedia = useCallback\(async \(kind: 'audio' \| 'video'\) => \{
  const unpublishMedia = useCallback\(\(kind: 'audio' \| 'video'\) => \{
      /\*\*
       \* Stop publishing media
       \*/
      const unpublishMedia = useCallback\(\(kind: 'audio' \| 'video'\) => \{
    try \{
      if \(mediaClientRef\.current\) \{
        mediaClientRef\.current\.unpublishMedia\(kind\);
      \}
    \} catch \(err\) \{
      const error = err instanceof Error \? err : new Error\(`Failed to unpublish \$\{kind\}`\);
      setError\(error\);
    \}
  \}, \[\]\);

  /\*\*
   \* Enable/disable audio
   \*/
  const setAudioEnabled = useCallback\(async \(enabled: boolean\) => \{
  const setAudioEnabled = useCallback\(\(enabled: boolean\) => \{
      /\*\*
       \* Enable/disable audio
       \*/
      const setAudioEnabled = useCallback\(\(enabled: boolean\) => \{
    try \{
      if \(mediaClientRef\.current\) \{
        mediaClientRef\.current\.setAudioEnabled\(enabled\);
      \}
    \} catch \(err\) \{
      const error = err instanceof Error \? err : new Error\('Failed to toggle audio'\);
      setError\(error\);
    \}
  \}, \[\]\);

  /\*\*
   \* Enable/disable video
   \*/
  const setVideoEnabled = useCallback\(async \(enabled: boolean\) => \{
  const setVideoEnabled = useCallback\(\(enabled: boolean\) => \{
      /\*\*
       \* Enable/disable video
       \*/
      const setVideoEnabled = useCallback\(\(enabled: boolean\) => \{
"@, @"
  /**
   * Stop publishing media
   */
  const unpublishMedia = useCallback((kind: 'audio' | 'video') => {
    try {
      if (mediaClientRef.current) {
        mediaClientRef.current.unpublishMedia(kind);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to unpublish $`${kind}`);
      setError(error);
    }
  }, []);

  /**
   * Enable/disable audio
   */
  const setAudioEnabled = useCallback((enabled: boolean) => {
    try {
      if (mediaClientRef.current) {
        mediaClientRef.current.setAudioEnabled(enabled);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle audio');
      setError(error);
    }
  }, []);

  /**
   * Enable/disable video
   */
  const setVideoEnabled = useCallback((enabled: boolean) => {
"@

Set-Content $file -Value $fixed

Write-Host "Fixed useRoom.ts"
