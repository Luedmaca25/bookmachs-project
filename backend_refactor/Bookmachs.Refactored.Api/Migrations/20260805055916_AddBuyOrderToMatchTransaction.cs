using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBuyOrderToMatchTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BuyOrder",
                table: "MatchTransactions",
                type: "nvarchar(26)",
                maxLength: 26,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchTransactions_BuyOrder",
                table: "MatchTransactions",
                column: "BuyOrder",
                unique: true,
                filter: "[BuyOrder] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MatchTransactions_BuyOrder",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "BuyOrder",
                table: "MatchTransactions");
        }
    }
}
